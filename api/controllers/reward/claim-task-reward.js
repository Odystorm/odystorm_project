module.exports = {
  friendlyName: 'Claim task reward',

  description: '',

  inputs: {
    telegramId: {
      type: 'string',
      description: 'Telegram User ID',
    },
    claimedTask: {
      type: 'json',
      description: 'Claimed Task',
    },
  },

  exits: {},

  fn: async function ({ telegramId, claimedTask }) {
    const { res } = this
    try {
      const userRecord = await User.findOne({ chatId: telegramId })
      const task = await Tasks.findOne({
        id: claimedTask.id,
        owner: userRecord.id,
      })
      const wallet = await Wallet.findOne({ owner: userRecord.id })

      if (!task) {
        return res.notFound({
          message: 'Task not found',
        })
      }

      if (task.status === 'done') {
        return res.badRequest({
          message: 'Task is already done',
        })
      }

      // @todo Check for If user has reached Milestone
      if (task && task.milestone) {
        if (task.requirement.mineTotal > wallet.balance) {
          return res.badRequest({ message: 'Milestone not reached' })
        }
      }

      // @todo Set Up Claiming Task Reward for Social Media Following

      await Wallet.updateOne({ owner: userRecord.id }).set({
        balance: wallet.balance + task.rewardAmount,
      })

      await Tasks.updateOne({id:task.id}).set({
        status:"done"
      })

      return res.status(200).json({
        message: 'Successfully completed task',
      })
    } catch (error) {
      console.error(error)

      return res.serverError({
        message: 'Failed to claim task reward',
      })
    }
  },
}
