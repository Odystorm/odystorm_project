const axios = require('axios')

module.exports.cronjob = {
  sendReminderEvery3Hours: {
    on: 'ready',
    schedule: '0 */3 * * *', // Run every 3 hours
    onTick: async function () {
      sails.log.info('Currently Running System Checks...')
      const url = `https://odystorm-bot.onrender.com/mine/session/reminder`
      try {
        const response = await axios.get(url)
        sails.log.info(response.status)
      } catch (error) {
        sails.log.error('Failed to Run Reminder Cron Job')
      }
    },
  },
}
