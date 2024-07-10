module.exports = {
  friendlyName: 'Confirm daily reward',

  description: '',

  inputs: {
    telegramId: {
      type: 'string',
      description: 'Telegram User',
    },
  },

  exits: {},

  fn: async function ({ telegramId }) {
    const { res } = this

    try {
      // Find User & User Activity
      const userRecord = await User.findOne({ chatId: telegramId })
      const activity = await Activity.findOne({ owner: userRecord.id })

      await Activity.updateOne({
        owner:activity.id
      }).set({
        
      })

    } catch (error) {
      sails.log.error(error)
    }
  },
}
