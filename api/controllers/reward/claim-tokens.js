module.exports = {
  friendlyName: 'Claim tokens',

  description: '',

  inputs: {
    telegramId: {
      type: 'string',
      description: "Current User's Telegram Id",
    },
    tokenFarmAmount: {
      type: 'number',
      description: 'Amount of Tokens Farmed',
    },
  },

  exits: {},

  fn: async function ({ telegramId, tokenFarmAmount }) {
    const { res } = this

    try {
      // Find User
      const userRecord = await User.findOne({ chatId: telegramId })
      const wallet = await Wallet.findOne({ owner: userRecord.id })

      if(userRecord){
        sails.log.debug("Updating Activity Model...")
        await Activity.updateOne({
          owner: userRecord.id,
        }).set({
          currentlyFarming: false,
          eligibleClaimAmount: 0,
          farmData: {},
        })
      }

      await Wallet.updateOne({
        id: wallet.id,
      }).set({
        balance: wallet.balance + tokenFarmAmount,
      })

      return res.status(200).json({
        message: 'Successfully claimed tokens',
      })
    } catch (error) {
      sails.log.error(error)
      return res.serverError({
        message: 'There was a problem claiming your tokens',
      })
    }
  },
}
