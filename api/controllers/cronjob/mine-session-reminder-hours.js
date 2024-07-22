const { differenceInHours } = require('date-fns')

module.exports = {
  friendlyName: 'Mine session reminder hours',

  description: '',

  inputs: {},

  exits: {},

  fn: async function () {
    const { res } = this
    const mineSessions = await Farm.find({
      status: 'farming',
      twelveHourReminded: false,
    })
    if (mineSessions.length > 0) {
      const finishedHoursAgo = mineSessions.filter(
        (session) =>
          differenceInHours(Date.now(), session.endTime) > 12 &&
          differenceInHours(Date.now(), session.endTime) < 24
      )

      // Find Activity and Users
      await Promise.all(
        finishedHoursAgo.map(async (session) => {
          const botBaseURL = sails.config.custom.botBaseURL
          try {
            const userActivity = await Activity.findOne({
              id: session.activity,
            })
            const userRecord = await User.findOne({ id: userActivity.owner })

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

            await sails.helpers.sendMessageCustom(
              userRecord.chatId,
              `Hello ${userRecord.firstName}\nYour Mining Session finished a while ago, check in now to claim your $ODY ${session.eligibleClaimAmount} and start a new mining session.`,
              inlineKeyboard
            )

            await Farm.updateOne({ id: session.id }).set({
              twelveHourReminded: true,
            })
          } catch (error) {
            sails.log.error(error)
          }
        })
      )
    }

    return res.status(200).json({
      message: 'Reminder Run Complete',
    })
  },
}
