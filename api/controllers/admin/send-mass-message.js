module.exports = {
  friendlyName: 'Send mass message',

  description: '',

  inputs: {
    photoUrl: {
      type: 'string',
      description: 'Photo URL',
    },
    message: {
      type: 'string',
      description: 'Mass Messaging',
      required: true,
    },
  },

  exits: {},

  fn: async function ({ message, photoUrl }) {
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

          if (photoUrl) {
            await sails.helpers.sendPhoto(
              user.chatId,
              photoUrl,
              message,
              inlineKeyboard
            )
          } else {
            await sails.helpers.sendMessageCustom(
              user.chatId,
              message,
              inlineKeyboard
            )
          }
        })
      )

      return res.status(200).json({
        message: 'Successfully Sent Message',
      })
    } catch (error) {
      sails.log.error(error)
      return res.serverError(error)
    }
  },
}
