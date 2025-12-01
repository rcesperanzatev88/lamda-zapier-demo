/**
 * Execution Model
 * Handles all DynamoDB operations for execution records
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const dynamodb_client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-1' });
const ddb = DynamoDBDocumentClient.from(dynamodb_client);

const EXECUTIONS_TABLE = process.env.EXECUTIONS_TABLE || 'sqs-executions';

class ExecutionModel {
    /**
     * DOCU: Create new execution record in DynamoDB <br>
     * Triggered: ProducerController.createAndQueueExecution() <br>
     * Last Updated Date: November 30, 2025
     * @async
     * @function
     * @memberOf ExecutionModel
     * @param {string} execution_id - Unique execution identifier
     * @param {Object} payload - Request payload
     * @returns {Promise<Object>} Created execution record
     * @author Vibe Team
     */
    static createExecution = async (execution_id, payload) => {
    const timestamp = new Date().toISOString();
    const execution_record = {
        PK: `EXEC#${execution_id}`,
        SK: 'META',
        execution_id: execution_id,
        status: 'queued',
        action: payload.action,
        payload: payload,
        created_at: timestamp,
        updated_at: timestamp,
        retry_count: 0,
        GSI1PK: 'STATUS#queued',
        GSI1SK: timestamp
    };

    await ddb.send(new PutCommand({
        TableName: EXECUTIONS_TABLE,
        Item: execution_record
    }));

        return execution_record;
    };

    /**
     * DOCU: Get execution record by ID from DynamoDB <br>
     * Triggered: ProducerController.getExecutionStatus(), ConsumerController.handleConsumer() <br>
     * Last Updated Date: November 30, 2025
     * @async
     * @function
     * @memberOf ExecutionModel
     * @param {string} execution_id - Execution identifier
     * @returns {Promise<Object|null>} Execution record or null
     * @author Vibe Team
     */
    static getExecution = async (execution_id) => {
    const result = await ddb.send(new GetCommand({
        TableName: EXECUTIONS_TABLE,
        Key: {
            PK: `EXEC#${execution_id}`,
            SK: 'META'
        }
    }));

        return result.Item || null;
    };

    /**
     * DOCU: Update execution status and result in DynamoDB <br>
     * Triggered: ConsumerController.processMessage(), ReplayController.replayExecution() <br>
     * Last Updated Date: November 30, 2025
     * @async
     * @function
     * @memberOf ExecutionModel
     * @param {string} execution_id - Execution identifier
     * @param {string} status - New status (processing|completed|failed)
     * @param {Object} result_data - Result data
     * @param {number} retry_count - Current retry count
     * @returns {Promise<void>}
     * @author Vibe Team
     */
    static updateExecution = async (execution_id, status, result_data = null, retry_count = 0) => {
    const timestamp = new Date().toISOString();
    const update_params = {
        TableName: EXECUTIONS_TABLE,
        Key: {
            PK: `EXEC#${execution_id}`,
            SK: 'META'
        },
        UpdateExpression: 'SET #status = :status, updated_at = :timestamp, retry_count = :retry_count, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk',
        ExpressionAttributeNames: {
            '#status': 'status'
        },
        ExpressionAttributeValues: {
            ':status': status,
            ':timestamp': timestamp,
            ':retry_count': retry_count,
            ':gsi1pk': `STATUS#${status}`,
            ':gsi1sk': timestamp
        }
        };

        if(result_data){
            update_params.UpdateExpression += ', #result = :result';
            update_params.ExpressionAttributeNames['#result'] = 'result';
            update_params.ExpressionAttributeValues[':result'] = result_data;
        }

        await ddb.send(new UpdateCommand(update_params));
    };
}

module.exports = ExecutionModel;
