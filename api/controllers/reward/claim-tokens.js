module.exports = {
  friendlyName: 'Claim tokens',

  description: '',

  inputs: {
    telegramId: {
      type: 'string',
      description: "Current User's Telegram Id",
    },
    farmId: {
      type: 'string',
      description: 'Farm ID',
    },
    tokenFarmAmount: {
      type: 'number',
      description: 'Amount of Tokens Farmed',
    },
  },

  exits: {},

  fn: async function ({ telegramId, farmId, tokenFarmAmount }) {
    const { res } = this

    try {
      // Find User
      const userRecord = await User.findOne({ chatId: telegramId })
      const wallet = await Wallet.findOne({ owner: userRecord.id })

      // Update Farm Status
      await Wallet.updateOne({
        id: wallet.id,
      }).set({
        balance: wallet.balance + tokenFarmAmount,
      })

      await Farm.updateOne({ id: farmId }).set({
        status: 'farmed',
      })

      // Pay Referer
      const referrer = await User.findOne({ referrer: userRecord.referrer })
      if (referrer) {
        // Find Wallet
        const wallet = await Wallet.findOne({ owner: referrer.id })
        const share = (10 / 100) * tokenFarmAmount

        // Update Wallet Balance
        await Wallet.updateOne({ id: wallet.id }).set({
          wallet: wallet.balance + share,
        })

        // Notify User of Their Share
        await sails.helpers.sendMessage(
          referrer.chatId,
          `Hello Soldier!\nYou just received token shares from your fellow comrade's mining, your account balance just received $ODY ${share}`
        )
      }

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
