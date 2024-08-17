module.exports = {
  friendlyName: 'Create task',

  description: 'Create New Task for All users',

  inputs: {
    title: {
      type: 'string',
      description: 'Task Title',
      required: true,
    },
    instruction: {
      type: 'string',
      description: 'Instruction for Task',
    },
    rewardAmount: {
      type: 'number',
      description: 'Task Reward Amount',
      required: true,
    },
    taskType: {
      type: 'string',
      isIn: ['milestone', 'social_following', 'ody_tasks'],
      required: true,
    },
    url: {
      type: 'string',
    },
    icon: {
      type: 'string',
    },
  },

  exits: {},

  fn: async function ({
    title,
    rewardAmount,
    taskType,
    url,
    icon,
    instruction,
  }) {
    const { res } = this

    if (taskType === 'milestone') {
      return res.badRequest({ message: 'Feature in development' })
    }

    try {
      // Find All Users
      const users = await User.find({})
      // Create a New Task per User
      const newTasks = users.map(async (user) => {
        // New Task
        await Tasks.create({
          owner: user.id,
          title,
          rewardAmount,
          taskType,
          requirement: {
            mineTotal: 0,
            url,
            isClicked: false,
            instruction: instruction ? instruction : '',
          },
          icon,
        })

        // Send Message to All Users
        await sails.helpers.sendMessage(
          user.chatId,
          `🚀 New Mission Alert! 🚀\nA fresh task has just been added to the system! Complete it quickly to win $ODY ${rewardAmount.toLocaleString()}. Don't miss out on the opportunity to boost your stash!\n\n🌌 Get started now and conquer the mission!`
        )
      })

      await Promise.all(newTasks)

      return res.status(200).json({ message: 'Successfully Addded task' })
    } catch (error) {
      sails.log.error(error)
      return res.serverError({
        message: 'There was a problem creating this task',
      })
    }
  },
}
