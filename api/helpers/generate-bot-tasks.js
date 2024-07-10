const tasks = [
  {
    title: 'Farm 50,000 $ODY',
    rewardAmount: 50000,
    taskType: 'milestone',
    icon: '$ody_logo',
  },
  {
    title: 'Farm 100,000 $ODY',
    rewardAmount: 100000,
    taskType: 'milestone',
    icon: '$ody_logo',
  },
  {
    title: 'Farm 200,000 $ODY',
    rewardAmount: 200000,
    taskType: 'milestone',
    icon: '$ody_logo',
  },
  {
    title: 'Farm 400,000 $ODY',
    rewardAmount: 400000,
    taskType: 'milestone',
    icon: '$ody_logo',
  },
  {
    title: 'Farm 800,000 $ODY',
    rewardAmount: 800000,
    taskType: 'milestone',
    icon: '$ody_logo',
  },
  {
    title: 'Farm 1,600,000 $ODY',
    rewardAmount: 1600000,
    taskType: 'milestone',
    icon: '$ody_logo',
  },
  {
    title: 'Farm 3,200,000 $ODY',
    rewardAmount: 3200000,
    taskType: 'milestone',
    icon: '$ody_logo',
  },
  {
    title: 'Farm 6,400,000 $ODY',
    rewardAmount: 6400000,
    taskType: 'milestone',
    icon: '$ody_logo',
  },
  {
    title: 'Farm 12,800,000 $ODY',
    rewardAmount: 12800000,
    taskType: 'milestone',
    icon: '$ody_logo',
  },
  {
    title: 'Farm 25,600,000 $ODY',
    rewardAmount: 25600000,
    taskType: 'milestone',
    icon: '$ody_logo',
  },
]

module.exports = {
  friendlyName: 'Generate bot tasks',

  description: '',

  inputs: {
    id: {
      type: 'string',
      description: 'ID of User',
      required: true,
    },
  },

  exits: {
    success: {
      description: 'All done.',
    },
  },

  fn: async function ({ id }) {
    const createTasks = tasks.map(async (task) => {
      try {
        await Tasks.create({
          owner: id,
          title: task.title,
          rewardAmount: task.rewardAmount,
          taskType: task.taskType,
          icon: 'ody_logo',
        })
      } catch (error) {
        sails.log.error(error)
      }
    })

    await Promise.all(createTasks)
  },
}
