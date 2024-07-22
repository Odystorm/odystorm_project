module.exports = {
  friendlyName: 'Get wallet',

  description: '',

  inputs: {},

  exits: {},

  fn: async function (inputs) {
    const { req, res } = this
    const { tgId } = req.params

    try {
      const userRecord = await User.findOne({ chatId: tgId })
      const wallet = await Wallet.findOne({ owner: userRecord.id })
      const activity = await Activity.findOne({ owner: userRecord.id })

      return res.status(200).json({ ...wallet, activity })
    } catch (error) {
      return res.serverError({
        message: 'Failed to retrieve wallet data',
      })
    }
  },
}
