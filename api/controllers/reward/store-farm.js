module.exports = {
  friendlyName: 'Store farm',

  description: '',

  inputs: {
    telegramId: {
      type: 'string',
      description: "Current User's Telegram Id",
      required: true,
    },
    startTime: {
      type: 'number',
      description: 'Timestamp of Start Time',
    },
    endTime: {
      type: 'number',
      description: 'Timestamp of End Time',
    },
    hours: {
      type: 'number',
      description: 'No. Of Farming hours',
    },
    eligibleClaimAmount: {
      type: 'number',
      description: 'Eligible Claim Amount',
    },
  },

  exits: {},

  fn: async function ({
    telegramId,
    startTime,
    endTime,
    hours,
    eligibleClaimAmount,
  }) {
    const { res } = this

    try {
      // Find User
      const userRecord = await User.findOne({ chatId: telegramId })
      const activity = await Activity.findOne({ owner: userRecord.id })

      // Create New Farm Record
      const newFarm = await Farm.create({
        activity: activity.id,
        startTime: startTime,
        endTime: endTime,
        hours: hours,
        increment: activity.farmLevel,
        eligibleClaimAmount: eligibleClaimAmount,
      }).fetch()

      await Activity.updateOne({ id: activity.id }).set({
        currentlyFarming: true,
      })

      return res.status(200).json({
        message: 'Successfully updated timeline',
        ...newFarm,
      })
    } catch (error) {
      sails.log.error(error)
      return res.serverError({ message: 'Failed to Store Farm Timeline data' })
    }
  },
}
