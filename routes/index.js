/**
 * Routes Index
 * Maps API Gateway paths to controllers
 */

const ProducerController = require('../controllers/producer.controller');
const ConsumerController = require('../controllers/consumer.controller');
const ReplayController = require('../controllers/replay.controller');

/**
 * DOCU: Route API Gateway requests to appropriate controller <br>
 * Triggered: index.handleAPIGatewayEvent() <br>
 * Last Updated Date: November 30, 2025
 * @async
 * @function
 * @param {Object} event - API Gateway event
 * @returns {Promise<Object>} Controller response
 * @author Vibe Team
 */
async function routeRequest(event){
    const path = event.path || event.rawPath || '';
    const body = JSON.parse(event.body || '{}');

    // Route based on path
    if(path.includes('/producer')){
        return await ProducerController.handleProducer(body);
    }

    if(path.includes('/consumer')){
        return await ConsumerController.handleConsumer(body);
    }

    if(path.includes('/replay')){
        return await ReplayController.handleReplay(body);
    }

    // Unknown route
    return {
        status: false,
        error: 'Invalid route. Available routes: /producer, /consumer, /replay',
        result: null
    };
}

module.exports = {
    routeRequest
};
