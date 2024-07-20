const tasks = [
  {
    title: 'Join OdyStorm Telegram',
    rewardAmount: 10000,
    taskType: 'social_following',
    requirement: {
      mineTotal: 0,
      url: 'https://t.me/odystormofficial',
      isClicked: false,
    },
    icon: 'telegram',
  },
  {
    title: 'Follow OdyStorm on X',
    rewardAmount: 10000,
    taskType: 'social_following',
    requirement: {
      mineTotal: 0,
      url: 'https://x.com/odystorm',
      isClicked: false,
    },
    icon: 'x',
  },
  {
    title: 'Subscribe To OdyStorm YouTube',
    rewardAmount: 10000,
    taskType: 'social_following',
    requirement: {
      mineTotal: 0,
      url: 'https://www.youtube.com/@odystormofficial',
      isClicked: false,
    },
    icon: 'youtube',
  },
  {
    title: 'OdyStorm on Tik Tok',
    rewardAmount: 10000,
    taskType: 'social_following',
    requirement: {
      mineTotal: 0,
      url: 'https://www.tiktok.com/@odystormofficial',
      isClicked: false,
    },
    icon: 'youtube',
  },
  {
    title: 'Mine 50,000 $ODY',
    rewardAmount: 10000,
    taskType: 'milestone',
    requirement: {
      mineTotal: 50000,
    },
    icon: '$ody_logo',
  },
  {
    title: 'Mine 100,000 $ODY',
    rewardAmount: 20000,
    taskType: 'milestone',
    requirement: {
      mineTotal: 100000,
    },
    icon: '$ody_logo',
  },
  {
    title: 'Mine 200,000 $ODY',
    rewardAmount: 40000,
    taskType: 'milestone',
    requirement: {
      mineTotal: 200000,
    },
    icon: '$ody_logo',
  },
  {
    title: 'Mine 400,000 $ODY',
    rewardAmount: 80000,
    taskType: 'milestone',
    requirement: {
      mineTotal: 400000,
    },
    icon: '$ody_logo',
  },
  {
    title: 'Mine 800,000 $ODY',
    rewardAmount: 160000,
    taskType: 'milestone',
    requirement: {
      mineTotal: 800000,
    },
    icon: '$ody_logo',
  },
  {
    title: 'Mine 1,600,000 $ODY',
    rewardAmount: 320000,
    taskType: 'milestone',
    requirement: {
      mineTotal: 1600000,
    },
    icon: '$ody_logo',
  },
  {
    title: 'Mine 3,200,000 $ODY',
    rewardAmount: 640000,
    taskType: 'milestone',
    requirement: {
      mineTotal: 3200000,
    },
    icon: '$ody_logo',
  },
  {
    title: 'Mine 6,400,000 $ODY',
    rewardAmount: 1280000,
    taskType: 'milestone',
    requirement: {
      mineTotal: 6400000,
    },
    icon: '$ody_logo',
  },
  {
    title: 'Mine 12,800,000 $ODY',
    rewardAmount: 2560000,
    taskType: 'milestone',
    requirement: {
      mineTotal: 12800000,
    },
    icon: '$ody_logo',
  },
  {
    title: 'Mine 25,600,000 $ODY',
    rewardAmount: 5120000,
    taskType: 'milestone',
    requirement: {
      mineTotal: 25600000,
    },
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
        if (task.taskType === 'milestone') {
          await Tasks.create({
            owner: id,
            title: task.title,
            rewardAmount: task.rewardAmount,
            taskType: task.taskType,
            requirement: task.requirement,
            icon: 'ody_logo',
          })
        }

        if (task.taskType === 'social_following') {
          await Tasks.create({
            owner: id,
            title: task.title,
            rewardAmount: task.rewardAmount,
            taskType: task.taskType,
            requirement: task.requirement,
            icon: task.icon,
          })
        }
      } catch (error) {
        sails.log.error(error)
      }
    })

    await Promise.all(createTasks)
  },
}
