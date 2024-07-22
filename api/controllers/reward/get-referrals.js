module.exports = {
  friendlyName: 'Get referrals',

  description: '',

  inputs: {},

  exits: {},

  fn: async function (inputs) {
    const { req, res } = this
    const { tgId } = req.params

    try {
      const userRecord = await User.findOne({ chatId: tgId })
      const referrals = await Referral.find({ owner: userRecord.id })
      const referralUserList = await Promise.all(
        referrals.map(async (referral) => {
          const userAccount = await User.findOne({ id: referral.user.id })
            .populate('wallet')
            .populate('referrals')
          return userAccount
        })
      )

      return res.status(200).json(referralUserList)
    } catch (error) {
      sails.log.error(error)

      return res.serverError({ message: 'Failed to get referrals' })
    }
  },
}
