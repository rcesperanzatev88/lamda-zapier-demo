/**
 * Log Model
 * Handles all DynamoDB operations for log records
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const dynamodb_client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-1' });
const ddb = DynamoDBDocumentClient.from(dynamodb_client);

const LOGS_TABLE = process.env.LOGS_TABLE || 'sqs-logs';
const TTL_DAYS = 90;

class LogModel {
    /**
     * DOCU: Write log entry to DynamoDB with TTL <br>
     * Triggered: ProducerController, ConsumerController, ReplayController <br>
     * Last Updated Date: November 30, 2025
     * @async
     * @function
     * @memberOf LogModel
     * @param {string} execution_id - Execution identifier
     * @param {string} level - Log level (info|error|warning)
     * @param {string} message - Log message
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<void>}
     * @author Vibe Team
     */
    static writeLog = async (execution_id, level, message, metadata = {}) => {
    const timestamp = new Date().toISOString();
    const ttl = Math.floor(Date.now() / 1000) + (TTL_DAYS * 24 * 60 * 60);
    const log_id = `${execution_id}_${Date.now()}`;

    const log_entry = {
        PK: `LOG#${execution_id}`,
        SK: timestamp,
        log_id: log_id,
        execution_id: execution_id,
        level: level,
        message: message,
        metadata: metadata,
        timestamp: timestamp,
        ttl: ttl
    };

        await ddb.send(new PutCommand({
            TableName: LOGS_TABLE,
            Item: log_entry
        }));
    };
}

module.exports = LogModel;
