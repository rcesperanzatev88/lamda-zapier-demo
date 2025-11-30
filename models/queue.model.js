/**
 * Queue Model
 * Handles all SQS operations for message queue management
 */

const { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');

const sqs_client = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });

const QUEUE_URL = process.env.QUEUE_URL;
const DLQ_URL = process.env.DLQ_URL;

class QueueModel {
    /**
     * DOCU: Send message to main SQS queue <br>
     * Triggered: ProducerController.createAndQueueExecution(), ReplayController.replayExecution() <br>
     * Last Updated Date: November 30, 2025
     * @async
     * @function
     * @memberOf QueueModel
     * @param {string} execution_id - Execution identifier
     * @param {Object} payload - Message payload
     * @returns {Promise<Object>} SQS response
     * @author Vibe Team
     */
    static sendToQueue = async (execution_id, payload) => {
    const message_body = {
        execution_id: execution_id,
        ...payload
    };

    const command = new SendMessageCommand({
        QueueUrl: QUEUE_URL,
        MessageBody: JSON.stringify(message_body),
        MessageAttributes: {
            execution_id: {
                DataType: 'String',
                StringValue: execution_id
            }
        }
    });

        return await sqs_client.send(command);
    };

    /**
     * DOCU: Fetch messages from Dead Letter Queue <br>
     * Triggered: ReplayController.replayAllFromDLQ() <br>
     * Last Updated Date: November 30, 2025
     * @async
     * @function
     * @memberOf QueueModel
     * @param {number} max_messages - Maximum messages to fetch (1-10)
     * @returns {Promise<Array>} Array of messages
     * @author Vibe Team
     */
    static fetchDLQMessages = async (max_messages = 10) => {
    const command = new ReceiveMessageCommand({
        QueueUrl: DLQ_URL,
        MaxNumberOfMessages: Math.min(max_messages, 10),
        WaitTimeSeconds: 0,
        MessageAttributeNames: ['All']
    });

        const result = await sqs_client.send(command);
        return result.Messages || [];
    };

    /**
     * DOCU: Delete message from Dead Letter Queue <br>
     * Triggered: ReplayController.replayAllFromDLQ() <br>
     * Last Updated Date: November 30, 2025
     * @async
     * @function
     * @memberOf QueueModel
     * @param {string} receipt_handle - Message receipt handle
     * @returns {Promise<void>}
     * @author Vibe Team
     */
    static deleteFromDLQ = async (receipt_handle) => {
        const command = new DeleteMessageCommand({
            QueueUrl: DLQ_URL,
            ReceiptHandle: receipt_handle
        });

        await sqs_client.send(command);
    };
}

module.exports = QueueModel;
