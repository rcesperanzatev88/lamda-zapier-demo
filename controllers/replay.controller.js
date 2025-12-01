/**
 * Replay Controller
 * Handles DLQ message replay functionality
 */

const ExecutionModel = require('../models/execution.model');
const QueueModel = require('../models/queue.model');
const LogModel = require('../models/log.model');

class ReplayController {
    /**
     * DOCU: Replay single execution from DLQ <br>
     * Triggered: ReplayController.handleReplay(), ReplayController.replayAllFromDLQ() <br>
     * Last Updated Date: November 30, 2025
     * @async
     * @function
     * @memberOf ReplayController
     * @param {string} execution_id - Execution identifier
     * @returns {Promise<Object>} Replay result
     * @author Vibe Team
     */
    static replayExecution = async (execution_id) => {
        try{
            // Get execution details
            const execution = await ExecutionModel.getExecution(execution_id);

            if(!execution){
                return {
                    execution_id: execution_id,
                    success: false,
                    error: 'Execution not found'
                };
            }

            // Prepare message payload
            const payload = execution.payload || {
                action: execution.action
            };

            // Send back to main queue
            await QueueModel.sendToQueue(execution_id, payload);

            // Reset execution status
            await ExecutionModel.updateExecution(execution_id, 'queued', null, 0);
            await LogModel.writeLog(execution_id, 'info', 'Execution replayed from DLQ', { payload });

            return {
                execution_id: execution_id,
                success: true,
                error: null
            };

        }
        catch(error){
            console.error('Replay error:', error);
            return {
                execution_id: execution_id,
                success: false,
                error: error.message
            };
        }
    };

    /**
     * DOCU: Replay all messages from DLQ <br>
     * Triggered: ReplayController.handleReplay() <br>
     * Last Updated Date: November 30, 2025
     * @async
     * @function
     * @memberOf ReplayController
     * @returns {Promise<Object>} Batch replay result
     * @author Vibe Team
     */
    static replayAllFromDLQ = async () => {
        const messages = await QueueModel.fetchDLQMessages(10);

        if(messages.length === 0){
            return {
                status: true,
                result: {
                    total: 0,
                    replayed: 0,
                    failed: 0,
                    message: 'No messages in DLQ'
                },
                error: null
            };
        }

        const results = [];

        for(const key in messages){
            const message = messages[key];
            const body = JSON.parse(message.Body);
            const execution_id = body.execution_id;

            const result = await ReplayController.replayExecution(execution_id);
            results.push(result);

            // Delete from DLQ if replay successful
            if(result.success){
                await QueueModel.deleteFromDLQ(message.ReceiptHandle);
            }
        }

        const replayed_count = results.filter(r => r.success).length;
        const failed_count = results.filter(r => !r.success).length;

        return {
            status: true,
            result: {
                total: messages.length,
                replayed: replayed_count,
                failed: failed_count,
                details: results
            },
            error: null
        };
    };

    /**
     * DOCU: Main replay handler - replay specific or all DLQ messages <br>
     * Triggered: Routes.routeRequest() <br>
     * Last Updated Date: November 30, 2025
     * @async
     * @function
     * @memberOf ReplayController
     * @param {Object} body - Request body with optional execution_ids array
     * @returns {Promise<Object>} Response object
     * @author Vibe Team
     */
    static handleReplay = async (body) => {
        try{
            // If specific execution_ids provided
            if(body.execution_ids && Array.isArray(body.execution_ids)){
                const results = [];

                for(const key in body.execution_ids){
                    const execution_id = body.execution_ids[key];
                    const result = await ReplayController.replayExecution(execution_id);
                    results.push(result);
                }

                const replayed_count = results.filter(r => r.success).length;
                const failed_count = results.filter(r => !r.success).length;

                return {
                    status: true,
                    result: {
                        total: body.execution_ids.length,
                        replayed: replayed_count,
                        failed: failed_count,
                        details: results
                    },
                    error: null
                };
            }

            // Otherwise, replay all from DLQ
            return await ReplayController.replayAllFromDLQ();

        }
        catch(error){
            console.error('Replay error:', error);
            return {
                status: false,
                error: error.message,
                result: null
            };
        }
    };
}

module.exports = ReplayController;
