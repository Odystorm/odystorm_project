module.exports = {
  friendlyName: 'Get task',

  description: '',

  inputs: {},

  exits: {},

  fn: async function (inputs) {
    const { req, res } = this
    const { id } = req.params

    const task = await Tasks.findOne({ id })

    if (!task) {
      return res.notFound({ message: 'Failed to find task' })
    }

    return res.status(200).json(task)
  },
}
