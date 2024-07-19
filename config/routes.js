/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes tell Sails what to do each time it receives a request.
 *
 * For more information on configuring custom routes, check out:
 * http://sailsjs.com/anatomy/config/routes-js
 */

module.exports.routes = {
  /***************************************************************************
   *                                                                          *
   * Custom routes here...                                                    *
   *                                                                          *
   * If a request to a URL doesn't match any of the custom routes above, it   *
   * is matched against Sails route blueprints. See `config/blueprints.js`    *
   * for configuration options and examples.                                  *
   *                                                                          *
   ***************************************************************************/
  'GET /': 'home/index',
  'GET /example': 'example/index',

  // Register New Account Via Referral
  'POST /register/referral': { action: 'user/process-referral' },

  // Play Page
  'GET /play': 'game/play',

  // User Wallet
  'GET /user/wallet/:tgId': { action: 'user/get-wallet' },
  // Tasks
  'GET /user/tasks/:tgId': { action: 'user/get-tasks' },
  // Claim Task Tokens
  'POST /user/tasks/claim': { action: 'reward/claim-task-reward' },

  // Activity
  // Store Farm Timeline
  'POST /api/v1/reward/store-farm': { action: 'reward/store-farm' },

  // Rewards
  'POST /api/v1/reward/confirm-daily-reward': {
    action: 'reward/confirm-daily-reward',
  },
  // Claim Farmed Tokens
  'POST /api/v1/reward/claim-tokens': {
    action: 'reward/claim-tokens',
  },
  // Stay Alive
  'GET /cron-job': {
    action: 'cronjob/stay-alive',
  },

  // Upgrades
  'POST /api/v1/upgrade/farming': { action: 'reward/upgrade-farm' },

  // Telegram Webhook
  'POST /telegram/webhook': { action: 'bot/telegram-events' },
}
