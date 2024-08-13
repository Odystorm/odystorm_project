module.exports = {
  friendlyName: 'Click social task',

  description: '',

  inputs: {
    telegramId: {
      type: 'string',
      description: "Current User's Telegram Id",
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
        or: [{ taskType: 'ody_tasks' }, { taskType: 'social_following' }],
      })

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

      await Tasks.updateOne({
        id: task.id,
      }).set({
        requirement: {
          ...task.requirement,
          isClicked: true,
        },
      })

      return res.status(200).json({
        message: 'Successfully clicked task',
      })
    } catch (error) {
      console.error(error)

      return res.serverError({
        message: 'Failed to claim task reward',
      })
    }
  },
}
