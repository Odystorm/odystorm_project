// @ts-nocheck
const axios = require('axios')

module.exports = {
  friendlyName: 'Send Telegram message',

  description: 'Send Message Via Bot',

  inputs: {
    chatId: {
      type: 'string',
      description: 'User Chat ID',
    },
    text: {
      type: 'string',
      description: 'Message to send to user',
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
  },

  fn: async function ({ chatId, text }) {
    const TOKEN = process.env.TELEGRAM_BOT_TOKEN
    const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`

    await axios
      .post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: chatId,
        text: text,
      })
      .then((res) => {
        sails.log.info(res.data)
      })
      .catch((error) => {
        sails.log.info(error)
      })
  },
}
