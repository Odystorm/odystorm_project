module.exports = {
  friendlyName: 'Store farm',

  description: '',

  inputs: {
    telegramId: {
      type: 'string',
      description: "Current User's Telegram Id",
      required: true,
    },
    timeline: {
      type: 'json',
      description: 'Start and End Time Data',
      required: true,
    },
    farmSessionId: {
      type: 'string',
      description: 'Farm Session ID',
      example: 'V1StGXR8_Z5jdHi6B-myT',
      required: true,
    },
    eligibleClaimAmount: {
      type: 'number',
      description: 'Eligible Claim Amount',
    },
  },

  exits: {},

  fn: async function ({
    telegramId,
    timeline,
    farmSessionId,
    eligibleClaimAmount,
  }) {
    const { res } = this

    try {
      // Find User
      const userRecord = await User.findOne({ chatId: telegramId })
      const activity = await Activity.findOne({ owner: userRecord.id })

      // Create New Farm Record

      const newFarmRecord = await Farm.create({
        farmSessionId,
        startTime: timeline.startTime,
        endTime: timeline.endTime,
        hours: timeline.hours,
        increment: timeline.increment,
        eligibleClaimAmount: timeline.savedScore ? timeline.savedScore : 0,
      }).fetch()

      // await Activity.updateOne({ id: activity.id }).set({
      //   farmdata: timeline,
      //   eligibleClaimAmount,
      //   currentlyFarming: true,
      // })

      return res.status(200).json({
        message: 'Successfully updated timeline',
      })
    } catch (error) {
      sails.log.error(error)
      return res.serverError({ message: 'Failed to Store Farm Timeline data' })
    }
  },
}
