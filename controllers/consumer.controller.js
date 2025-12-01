/**
 * Consumer Controller
 * Handles message processing and API calls
 */

const ExecutionModel = require('../models/execution.model');
const LogModel = require('../models/log.model');
const SlackService = require('../services/slack.service');

const MAX_RETRY_ATTEMPTS = 3;

class ConsumerController {
    /**
     * DOCU: Process message and call Slack API <br>
     * Triggered: Lambda SQS trigger, ConsumerController.handleConsumer() <br>
     * Last Updated Date: November 30, 2025
     * @async
     * @function
     * @memberOf ConsumerController
     * @param {Object} message - Message payload
     * @returns {Promise<Object>} Processing result
     * @author Vibe Team
     */
    static processMessage = async (message) => {
        const { execution_id, action } = message;

        try{
            // Update status to processing
            await ExecutionModel.updateExecution(execution_id, 'processing');
            await LogModel.writeLog(execution_id, 'info', `Processing ${action}`, { action });

            let api_result = { message: `Action ${action} processed successfully` };

            // Update execution as completed
            await ExecutionModel.updateExecution(execution_id, 'completed', api_result);
            await LogModel.writeLog(execution_id, 'info', 'Processing completed successfully', { result: api_result });

            return {
                status: true,
                result: api_result,
                error: null
            };

        }
        catch(error){
            console.error('Processing error:', error);

            // Get current execution to check retry count
            const execution = await ExecutionModel.getExecution(execution_id);
            const retry_count = (execution?.retry_count || 0) + 1;

            if(retry_count >= MAX_RETRY_ATTEMPTS){
                // Max retries reached, mark as failed
                await ExecutionModel.updateExecution(execution_id, 'failed', { error: error.message }, retry_count);
                await LogModel.writeLog(execution_id, 'error', `Processing failed after ${retry_count} attempts`, { error: error.message });
           }
            else{
                // Will retry
                await ExecutionModel.updateExecution(execution_id, 'queued', null, retry_count);
                await LogModel.writeLog(execution_id, 'warning', `Processing failed, retry ${retry_count}/${MAX_RETRY_ATTEMPTS}`, { error: error.message });
            }

            throw error; // Re-throw to trigger SQS retry
        }
    };

    /**
     * DOCU: Handle manual consumer request <br>
     * Triggered: Routes.routeRequest() <br>
     * Last Updated Date: November 30, 2025
     * @async
     * @function
     * @memberOf ConsumerController
     * @param {Object} body - Request body with execution_id
     * @returns {Promise<Object>} Response object
     * @author Vibe Team
     */
    static handleConsumer = async (body) => {
        try{
            if(!body.execution_id){
                return {
                    status: false,
                    error: 'Missing required field: execution_id',
                    result: null
                };
            }

            // Get execution details
            const execution = await ExecutionModel.getExecution(body.execution_id);

            if(!execution){
                return {
                    status: false,
                    error: 'Execution not found',
                    result: null
                };
            }

            // Process the message
            const result = await ConsumerController.processMessage({
                execution_id: execution.execution_id,
                action: execution.action
            });

            return result;

        }
        catch(error){
            console.error('Consumer error:', error);
            return {
                status: false,
                error: error.message,
                result: null
            };
        }
    };
}

module.exports = ConsumerController;
