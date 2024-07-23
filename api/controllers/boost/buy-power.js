const { addHours } = require('date-fns')

module.exports = {
  friendlyName: 'Buy ship',

  description: '',

  inputs: {
    telegramId: {
      type: 'string',
      description: 'Telegram User ID',
    },
    upgrade: {
      type: 'json',
      description: 'Purchased Ship',
    },
  },

  exits: {},

  fn: async function ({ telegramId, upgrade }) {
    const { res } = this

    try {
      const userRecord = await User.findOne({ chatId: telegramId })
      const wallet = await Wallet.findOne({ owner: userRecord.id })
      const activity = await Activity.findOne({ owner: userRecord.id })

      const upgradeCost = upgrade.Cost / 2

      if (upgradeCost > wallet.balance) {
        return res.badRequest({
          message: 'Insufficient Balance to Purchase Upgrade',
        })
      }

      await Wallet.updateOne({ owner: userRecord.id }).set({
        balance: wallet.balance - upgradeCost,
      })

      await Activity.updateOne({ owner: userRecord.id }).set({
        currentNoOfFarmHours: upgrade.FarmPeriod,
      })

      // Check for Existing Farm Session
      const farm = await Farm.findOne({
        status: 'farming',
        activity: activity.id,
      })

      if (farm) {
        const { startTime, increment } = farm
        const endTime = addHours(startTime, upgrade.FarmPeriod) // New End Time

        const calculateFinalScore = (startTime, endTime, increment) => {
          const totalTimeInSeconds = Math.floor((endTime - startTime) / 1000)
          return totalTimeInSeconds * increment
        }
        
        await Farm.updateOne({ id: farm.id }).set({
          hours: upgrade.FarmPeriod,
          endTime: endTime,
          eligibleClaimAmount: calculateFinalScore(
            startTime,
            endTime,
            increment
          ),
        })
      }

      return res.status(200).json({
        message: 'Successfully bought new ship',
      })
    } catch (error) {
      sails.log.error(error)
      return res.serverError({ message: 'There was a problem buying the ship' })
    }
  },
}
