/**
 * Slack Service
 * Handles sending messages to Slack via webhooks
 */

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

class SlackService {
    /**
     * DOCU: Send message to Slack channel <br>
     * Triggered: Various controllers <br>
     * Last Updated Date: December 1, 2025
     * @async
     * @function
     * @memberOf SlackService
     * @param {string} message - Message text to send
     * @param {string} webhookUrl - Slack webhook URL (optional, defaults to env)
     * @returns {Promise<Object>} Slack API response
     * @author Vibe Team
     */
    static sendMessage = async (message, webhookUrl = null) => {
        const url = webhookUrl || SLACK_WEBHOOK_URL;

        if (!url) {
            throw new Error('Slack webhook URL not configured');
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: message
            })
        });

        if (!response.ok) {
            throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
        }

        return {
            status: 'ok',
            message: 'Message sent successfully'
        };
    };

    /**
     * DOCU: Send formatted message with blocks <br>
     * Triggered: Various controllers <br>
     * Last Updated Date: December 1, 2025
     * @async
     * @function
     * @memberOf SlackService
     * @param {Object} payload - Slack message payload with blocks
     * @param {string} webhookUrl - Slack webhook URL (optional, defaults to env)
     * @returns {Promise<Object>} Slack API response
     * @author Vibe Team
     */
    static sendFormattedMessage = async (payload, webhookUrl = null) => {
        const url = webhookUrl || SLACK_WEBHOOK_URL;

        if (!url) {
            throw new Error('Slack webhook URL not configured');
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
        }

        return {
            status: 'ok',
            message: 'Formatted message sent successfully'
        };
    };
}

module.exports = SlackService;
