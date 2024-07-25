module.exports = {
  friendlyName: 'Send mass message',

  description: '',

  inputs: {
    message: {
      type: 'string',
      description: 'Mass Messaging',
      required: true,
    },
  },

  exits: {},

  fn: async function ({ message }) {
    const { res } = this
    // Get All OdyStorm Users
    const users = await User.find({})

    try {
      await Promise.all(
        users.map(async (user) => {
          const botBaseURL = sails.config.custom.botBaseURL

          const inlineKeyboard = {
            inline_keyboard: [
              [
                {
                  text: 'Launch OdyStorm',
                  web_app: {
                    url: `${botBaseURL}/play?user=${user.chatId}`,
                  },
                },
              ],
            ],
          }

          await sails.helpers.sendMessageCustom(
            user.chatId,
            message,
            inlineKeyboard
          )
        })
      )
    } catch (error) {
      sails.log.error(error)
    }

    return res.status(200).json({
      message: 'Successfully Sent Message',
    })
  },
}
