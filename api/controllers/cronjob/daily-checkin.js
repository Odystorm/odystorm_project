const { differenceInDays, parseISO } = require('date-fns')

module.exports = {
  friendlyName: 'Daily checkin',

  description: '',

  inputs: {},

  exits: {},

  fn: async function (inputs) {
    const { res } = this

    try {
      const allUserActivity = await Activity.find({})
      const botBaseURL = sails.config.custom.botBaseURL

      await Promise.all(
        allUserActivity.map(async (activity) => {
          const userRecord = await User.findOne({ id: activity.owner })
          const inlineKeyboard = {
            inline_keyboard: [
              [
                {
                  text: 'Launch OdyStorm',
                  web_app: {
                    url: `${botBaseURL}/play?user=${userRecord.chatId}`,
                  },
                },
              ],
            ],
          }

          if (differenceInDays(Date.now(), parseISO(activity.lastLogin)) > 1) {
            await sails.helpers.sendMessageCustom(
              userRecord.chatId,
              `Hello Soldier,\n
              It's been a day since we last saw you in the OdyStorm galaxy. Log in now to continue your journey and protect the universe!\n\n
              See you in the stars,\nOdyStorm Space Defense`
            ),
              inlineKeyboard
          }

          if (differenceInDays(Date.now(), parseISO(activity.lastLogin)) > 3) {
            await sails.helpers.sendMessageCustom(
              userRecord.chatId,
              `Hello Soldier,\n
              Three days without you feels like an eternity in the cosmos.. Log in now to continue your journey and protect the universe!\n\n
              Rejoin the fight and claim your rewards!\nOdyStorm Space Defense`
            ),
              inlineKeyboard
          }

          if (differenceInDays(Date.now(), parseISO(activity.lastLogin)) > 7) {
            await sails.helpers.sendMessageCustom(
              userRecord.chatId,
              `Hello Space Explorer,\n
              It's been a week since your last visit to OdyStorm, and your presence has been missed. The galaxy is full of adventures waiting for you, and every pilot counts in the battle against the invaders. Come back and join the fight. Your journey is far from over!\n\nWe need you,\nOdyStorm Space Defense`
            ),
              inlineKeyboard
          }
        })
      )

      return res.status(200).json({
        message: 'Reminder Run Complete',
      })
    } catch (error) {
      sails.log.error(error)
    }
  },
}
