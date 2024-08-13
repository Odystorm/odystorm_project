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
