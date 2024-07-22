const { differenceInHours } = require('date-fns')

module.exports = {
  friendlyName: 'Mine session reminder',

  description: '',

  inputs: {},

  exits: {},

  fn: async function () {
    const { res } = this
    const mineSessions = await Farm.find({ status: 'farming' })
    if (mineSessions.length > 0) {
      // const readyToClaim = mineSessions.filter(
      //   (session) => differenceInHours(Date.now(), session.endTime) > 1
      // )

      // Find Activity and Users
      await Promise.all(
        mineSessions.map(async (session) => {
          try {
            const userActivity = await Activity.findOne({
              id: session.activity,
            })
            const userRecord = await User.findOne({ id: userActivity.owner })

            await sails.helpers.sendMessage(
              userRecord.chatId,
              `Hello ${userRecord.firstName}\nYour Mining Session finished a while ago, check in now to claim $ODY ${session.eligibleClaimAmount} and start a new mining session.`
            )
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
