module.exports = {
  friendlyName: 'reward upgrade-farm',

  description: '',

  inputs: {
    telegramId: {
      type: 'string',
      description: "Current User's Telegram Id",
    },
    upgrade: {
      type: 'json',
      description: 'Selected Upgrade Object',
    },
  },

  exits: {},

  fn: async function ({ telegramId, upgrade }) {
    const { res } = this

    try {
      // Find User
      const userRecord = await User.findOne({ chatId: telegramId })
      const wallet = await Wallet.findOne({ owner: userRecord.id })

      // Verify User Can Afford Upgrade
      if (upgrade.Cost > wallet.balance) {
        return res.badRequest({ message: "You can't afford this upgrade" })
      }

      await Activity.updateOne({
        owner: userRecord.id,
      }).set({
        farmLevel: upgrade.Increment,
        currentNoOfFarmHours: upgrade.FarmPeriod,
      })

      // @todo Deduct Upgrade Fees
      await Wallet.updateOne({
        id: wallet.id,
      }).set({
        balance: wallet.balance - upgrade.Cost,
      })

      return res.status(200).json({
        message: 'Successfully upgraded Farm Power',
      })
    } catch (error) {
      sails.log.error(error)

      return res.serverError({
        message: 'There was a problem upgrading your space ship',
      })
    }
  },
}
