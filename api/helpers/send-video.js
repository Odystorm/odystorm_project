const axios = require('axios')

module.exports = {
  friendlyName: 'Send Telegram Video',

  description: 'Send video Via Bot',

  inputs: {
    chatId: {
      type: 'string',
      description: 'User Chat ID',
      required: true,
    },
    video: {
      type: 'string',
      description: 'Video to Send',
      required: true,
    },
    caption: {
      type: 'string',
      description: 'Video Caption',
    },
    reply_markup: {
      type: 'json',
      description: 'Reply Markup',
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
  },

  fn: async function ({ chatId, video, caption, reply_markup }) {
    const TOKEN = process.env.TELEGRAM_BOT_TOKEN
    const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`

    await axios
      .post(`${TELEGRAM_API}/sendVideo`, {
        chat_id: chatId,
        video: video,
        caption: caption,
        protect_content: true,
        reply_markup,
      })
      .then((res) => {
        sails.log.info(res.data)
      })
      .catch((error) => {
        if (error.data) {
          sails.log.error(error.data)
          return
        }
        sails.log.error(error)
      })
  },
}
