module.exports = {
  friendlyName: 'Get current farm session',

  description: '',

  inputs: {},

  exits: {},

  fn: async function (inputs) {
    const { req, res } = this
    const { tgId } = req.params

    try {
      const userRecord = await User.findOne({ chatId: tgId })
      const activity = await Activity.findOne({ owner: userRecord.id })

      const currentFarmSession = await Farm.findOne({
        activity: activity.id,
        status: 'farming',
      })

      const currentFarm = currentFarmSession || null

      return res.status(200).json(currentFarm)
    } catch (error) {
      sails.log.error(error)

      return res.serverError({
        message: 'Failed to Retreive Current Session',
      })
    }
  },
}
