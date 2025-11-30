/**
 * Unified Lambda Handler (MVC Architecture)
 * Main entry point for SQS processing and API Gateway requests
 */

const ConsumerController = require('./controllers/consumer.controller');
const { routeRequest } = require('./routes');

/**
 * DOCU: Create HTTP response for API Gateway <br>
 * Triggered: handleAPIGatewayEvent() <br>
 * Last Updated Date: November 30, 2025
 * @function
 * @param {number} status_code - HTTP status code
 * @param {Object} body - Response body
 * @returns {Object} API Gateway response
 * @author Vibe Team
 */
function createResponse(status_code, body){
    return {
        statusCode: status_code,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify(body)
    };
}

/**
 * DOCU: Detect event source type (SQS or API Gateway) <br>
 * Triggered: exports.handler() <br>
 * Last Updated Date: November 30, 2025
 * @function
 * @param {Object} event - Lambda event
 * @returns {string} Event source type ('sqs' or 'apigateway')
 * @author Vibe Team
 */
function detectEventSource(event){
    if(event.Records && event.Records[0]?.eventSource === 'aws:sqs'){
        return 'sqs';
    }
    if(event.requestContext || event.httpMethod || event.path || event.rawPath){
        return 'apigateway';
    }
    return 'unknown';
}

/**
 * DOCU: Handle SQS events (automatic processing) <br>
 * Triggered: exports.handler() when SQS trigger fires <br>
 * Last Updated Date: November 30, 2025
 * @async
 * @function
 * @param {Object} event - SQS event
 * @returns {Promise<Object>} Processing result
 * @author Vibe Team
 */
async function handleSQSEvent(event){
    const results = [];

    for(const key in event.Records){
        const record = event.Records[key];
        const message = JSON.parse(record.body);

        try{
            const result = await ConsumerController.processMessage(message);
            results.push({ execution_id: message.execution_id, success: true, result });
        }
        catch(error){
            console.error('SQS processing error:', error);
            results.push({ execution_id: message.execution_id, success: false, error: error.message });
            throw error; // Re-throw to trigger SQS retry mechanism
        }
    }

    return { batchItemFailures: [] };
}

/**
 * DOCU: Handle API Gateway events (manual routes) <br>
 * Triggered: exports.handler() when API Gateway request received <br>
 * Last Updated Date: November 30, 2025
 * @async
 * @function
 * @param {Object} event - API Gateway event
 * @returns {Promise<Object>} HTTP response
 * @author Vibe Team
 */
async function handleAPIGatewayEvent(event){
    try{
        const result = await routeRequest(event);
        const status_code = result.status ? 200 : 400;
        return createResponse(status_code, result);
    }
    catch(error){
        console.error('API Gateway error:', error);
        return createResponse(500, {
            status: false,
            error: error.message,
            result: null
        });
    }
}

/**
 * DOCU: Main Lambda handler - entry point for all events <br>
 * Triggered: AWS Lambda runtime <br>
 * Last Updated Date: November 30, 2025
 * @async
 * @function
 * @param {Object} event - Lambda event (SQS or API Gateway)
 * @returns {Promise<Object>} Response
 * @author Vibe Team
 */
exports.handler = async (event) => {
    console.log('Event received:', JSON.stringify(event, null, 2));

    const event_source = detectEventSource(event);

    if(event_source === 'sqs'){
        return await handleSQSEvent(event);
    }

    if(event_source === 'apigateway'){
        return await handleAPIGatewayEvent(event);
    }

    return createResponse(400, {
        status: false,
        error: 'Unknown event source',
        result: null
    });
};
