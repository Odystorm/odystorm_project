module.exports = {
  friendlyName: 'Get tasks',

  description: '',

  inputs: {},

  exits: {},

  fn: async function (inputs) {
    const { req, res } = this
    const { tgId } = req.params

    try {
      const userRecord = await User.findOne({ chatId: tgId })
      const tasks = await Tasks.find({ owner: userRecord.id })

      if (tasks.length === 0) {
        await sails.helpers.generateBotTasks(userRecord.id)
        const newTaskList = await Tasks.find({ owner: userRecord.id })
        return res.status(200).json(newTaskList)
      }

      return res.status(200).json(tasks)
    } catch (error) {
      sails.log.error(error)
      return res.serverError({
        message: 'Failed to retrieve tasks data',
      })
    }
  },
}
