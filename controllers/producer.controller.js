/**
 * Producer Controller
 * Handles queue creation and execution status requests
 */

const { v4: uuidv4 } = require('uuid');
const ExecutionModel = require('../models/execution.model');
const QueueModel = require('../models/queue.model');
const LogModel = require('../models/log.model');
const SlackService = require('../services/slack.service');

const VALID_ACTIONS = ['get-status', 'send-slack-message', 'send-slack-formatted'];

class ProducerController {
    /**
     * DOCU: Validate action request payload <br>
     * Triggered: ProducerController.handleProducer() <br>
     * Last Updated Date: November 30, 2025
     * @function
     * @memberOf ProducerController
     * @param {Object} payload - Request payload
     * @returns {Object} Validation result {valid: boolean, error: string|null}
     * @author Vibe Team
     */
    static validateAction(payload){
        if(!payload.action){
            return { valid: false, error: 'Missing required field: action' };
        }

        if(!VALID_ACTIONS.includes(payload.action)){
            return { valid: false, error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` };
        }

        // Validate action-specific fields
        if(payload.action === 'get-status' && !payload.execution_id){
            return { valid: false, error: 'Missing required field: execution_id (for get-status action)' };
        }

        if(payload.action === 'send-slack-message' && !payload.message){
            return { valid: false, error: 'Missing required field: message (for send-slack-message action)' };
        }

        if(payload.action === 'send-slack-formatted' && !payload.payload){
            return { valid: false, error: 'Missing required field: payload (for send-slack-formatted action)' };
        }

        return { valid: true, error: null };
    }

    /**
     * DOCU: Get execution status from database <br>
     * Triggered: ProducerController.handleProducer() <br>
     * Last Updated Date: November 30, 2025
     * @async
     * @function
     * @memberOf ProducerController
     * @param {string} execution_id - Execution identifier
     * @returns {Promise<Object>} Response with execution details
     * @author Vibe Team
     */
    static getExecutionStatus = async (execution_id) => {
        const execution = await ExecutionModel.getExecution(execution_id);

        if(!execution){
            return {
                status: false,
                error: 'Execution not found',
                result: null
            };
        }

        return {
            status: true,
            result: {
                execution_id: execution.execution_id,
                status: execution.status,
                action: execution.action,
                created_at: execution.created_at,
                updated_at: execution.updated_at,
                retry_count: execution.retry_count,
                result: execution.result || null
            },
            error: null
        };
    };

    /**
     * DOCU: Create new execution record and queue it for processing <br>
     * Triggered: ProducerController.handleProducer() <br>
     * Last Updated Date: November 30, 2025
     * @async
     * @function
     * @memberOf ProducerController
     * @param {Object} payload - Request payload
     * @returns {Promise<Object>} Response with execution_id
     * @author Vibe Team
     */
    static createAndQueueExecution = async (payload) => {
        const execution_id = `exec_${uuidv4()}`;

        // Create execution record and send to queue in parallel
        await Promise.all([
            ExecutionModel.createExecution(execution_id, payload),
            QueueModel.sendToQueue(execution_id, payload)
        ]);

        // Log asynchronously (don't wait)
        LogModel.writeLog(execution_id, 'info', 'Execution queued', { action: payload.action }).catch(console.error);

        return {
            status: true,
            result: {
                execution_id: execution_id,
                message: 'Request queued successfully'
            },
            error: null
        };
    };

    /**
     * DOCU: Main producer handler - validates and routes requests <br>
     * Triggered: Routes.routeRequest() <br>
     * Last Updated Date: December 1, 2025
     * @async
     * @function
     * @memberOf ProducerController
     * @param {Object} body - Request body
     * @returns {Promise<Object>} Response object
     * @author Vibe Team
     */
    static handleProducer = async (body) => {
        try{
            // Validate request
            const validation = ProducerController.validateAction(body);
            if(!validation.valid){
                return {
                    status: false,
                    error: validation.error,
                    result: null
                };
            }

            // Handle get-status separately
            if(body.action === 'get-status'){
                return await ProducerController.getExecutionStatus(body.execution_id);
            }

            // Handle Slack messages directly (no queuing)
            if(body.action === 'send-slack-message'){
                const result = await SlackService.sendMessage(body.message, body.webhookUrl || null);
                return {
                    status: true,
                    result: result,
                    error: null
                };
            }

            if(body.action === 'send-slack-formatted'){
                const result = await SlackService.sendFormattedMessage(body.payload, body.webhookUrl || null);
                return {
                    status: true,
                    result: result,
                    error: null
                };
            }

            // Create and queue new execution
            return await ProducerController.createAndQueueExecution(body);

        }
        catch(error){
            console.error('Producer error:', error);
            return {
                status: false,
                error: error.message,
                result: null
            };
        }
    };
}

module.exports = ProducerController;
