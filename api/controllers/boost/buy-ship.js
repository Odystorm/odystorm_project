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
      const activity = await Activity.findOne({ owner: userRecord.id })
      const wallet = await Wallet.findOne({ owner: userRecord.id })

      if (upgrade.Cost > wallet.balance) {
        return res.badRequest({
          message: 'Insufficient Balance to Purchase Upgrade',
        })
      }

      await Wallet.updateOne({ owner: userRecord.id }).set({
        balance: wallet.balance - upgrade.Cost,
      })

      await Activity.updateOne({ id: activity.id }).set({
        farmLevel: upgrade.Increment,
      })

      // Check for Existing Farm Session
      const farm = await Farm.findOne({ status: 'farming' })

      if (farm) {
        await Farm.updateOne({ id: farm.id }).set({
          increment: upgrade.Increment,
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
