const axios = require('axios')

const liveUrl = `https://odystorm-bot.onrender.com`
const baseURL = liveUrl

module.exports.cronjob = {
  checkEvery5Minutes: {
    on: 'ready',
    schedule: '*/5 * * * *', // Run every 5 Minutes
    onTick: async function () {
      sails.log.info('Currently Running 10 Minute After Mine Reminder...')
      const url = `${baseURL}/mine/session/reminder/recent`
      try {
        const response = await axios.get(url)
        sails.log.info(response.status)
      } catch (error) {
        sails.log.error('Failed to Run Reminder Cron Job')
      }
    },
  },
  checkEveryHour: {
    schedule: '0 * * * *', // This cron expression means "at minute 0 of every hour"
    onTick: async function () {
      sails.log.info('Currently Running 12 Hours After Mine Reminder...')
      const url = `${baseURL}/mine/session/reminder/hours`
      try {
        const response = await axios.get(url)
        sails.log.info(response.status)
      } catch (error) {
        sails.log.error('Failed to Run Reminder Cron Job')
      }
    },
    start: true,
  },
}
