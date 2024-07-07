module.exports = {
  friendlyName: 'Process referral',

  description: '',

  inputs: {
    chatId: {
      type: 'string',
      description: "User's Chat ID",
    },
    referralId: {
      type: 'string',
      description: 'Referral ID',
      allowNull: true,
    },
  },

  exits: {},

  fn: async function ({ chatId, referralId }) {
    const { res } = this
    sails.log.debug(chatId, referralId)

    try {
      // Create New User
      const userRecord = await User.findOne({ chatId })

      let isUnique = false
      let newReferralId

      while (!isUnique) {
        newReferralId = await sails.helpers.genReferralCode()
        const existingUser = await User.findOne({ referralId: newReferralId })
        if (!existingUser) {
          isUnique = true
        }
      }

      if (!userRecord) {
        const user = await sails.helpers.getUser(chatId)
        const profilePicture = await sails.helpers.getProfilePhoto(chatId)

        // Find Refferer User
        const referrerUser = await User.findOne({ referralId })
        const referer = referrerUser.referralId || null

        const userRecord = await User.create({
          firstName: user.first_name,
          lastName: '',
          username: user.username,
          chatId: user.id,
          referrer: referer,
          referralId: newReferralId,
          profilePicture,
        }).fetch()

        const owner = userRecord.id
        await Wallet.create({ owner })
        await Activity.create({ owner })
        await Referral.create({ owner: referrerUser.id, user: userRecord })

        // Find Referrer Wallet
        const wallet = await Wallet.findOne({ owner: referrerUser.id })
        await Wallet.updateOne({ owner: referrerUser.id }).set({
          balance: wallet.balance + 20,
        })

        const inlineKeyboard = {
          inline_keyboard: [
            [
              {
                text: 'Launch Odysir',
                web_app: {
                  url: `https://gt35m9bz-1337.euw.devtunnels.ms/play?user=${referrerUser.chatId}`,
                },
              },
            ],
          ],
        }

        // Send Message To Referrer
        await sails.helpers.sendMessageCustom(
          referrerUser.chatId,
          `Hi ${referrerUser.firstName}\nYour buddy ${userRecord.firstName} just joined Odysir and you just received 20 ODY Tokens.`,
          inlineKeyboard
        )

        return res.status(200).json({
          message: 'Successfully Sign Up User',
        })
      }

      return res.status(200).json({
        message: 'User is already processed and Signed up',
      })
    } catch (error) {
      sails.log.error(error)
      return res.serverError({ message: 'Failed to Sign Up User' })
    }
  },
}