const axios = require('axios')

module.exports = {
  friendlyName: 'Get user',

  description: '',

  inputs: {
    chatId: {
      type: 'string',
      description: "User's Chat Id",
      required: true,
    },
  },

  exits: {
    success: {
      outputFriendlyName: 'User',
    },
  },

  fn: async function ({ chatId }) {
    const TOKEN = process.env.TELEGRAM_BOT_TOKEN
    const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}/getChat`

    try {
      // @ts-ignore
      const response = await axios.get(TELEGRAM_API, {
        params: {
          chat_id: chatId,
        },
      })

      const chatInfo = response.data.result
      console.log(chatInfo)
      return chatInfo
    } catch (error) {
      throw new Error(error)
    }
  },
}
