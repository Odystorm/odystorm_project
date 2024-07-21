const { isToday } = require('date-fns')

module.exports = {
  friendlyName: 'Play Page',

  description: 'Play.',

  inputs: {},

  exits: {
    success: {
      responseType: 'inertia',
    },
  },

  fn: async function () {
    const { req } = this
    const { user } = req.query

    try {
      const userRecord = await User.findOne({ chatId: user }).populate('wallet')
      const profilePicture = await sails.helpers.getProfilePhoto(
        userRecord.chatId
      )

      const referrals = await Referral.find({ owner: userRecord.id })
      const activity = await Activity.findOne({ owner: userRecord.id })
      const referralUserList = await Promise.all(
        referrals.map(async (referral) => {
          const userAccount = await User.findOne({ id: referral.user.id })
            .populate('wallet')
            .populate('referrals')
          return userAccount
        })
      )

      const tasksList = await Tasks.find({ owner: userRecord.id })

      const farm = await Farm.findOne({
        activity: activity.id,
        status: 'farming',
      })
      const currentFarm = farm || null

      let eligibleForDailyBonus = false

      // Update Last Login Record & No Of Active Days
      const today = new Date()

      if (activity.lastLogin !== '') {
        const activeDays = await Day.find({ activity: activity.id })

        if (
          activeDays.length > 0 &&
          !isToday(activeDays[activeDays.length - 1].createdAt)
        ) {
          await Day.create({ activity: activity.id })
          await Activity.updateOne({ owner: userRecord.id }).set({
            noOfActiveDays: activeDays.length,
          })
          eligibleForDailyBonus = true
        }
      }

      // Update Last Login
      await Activity.updateOne({ owner: userRecord.id }).set({
        lastLogin: today,
      })

      // Set Bonus Reward for the Day
      if (eligibleForDailyBonus) {
        // Find Current Wallet to Get Balance
        const wallet = await Wallet.findOne({ owner: userRecord.id })
        await Wallet.updateOne({ owner: userRecord.id }).set({
          balance: wallet.balance + 100,
        })
      }

      return {
        page: 'play/index',
        props: {
          user: {
            ...userRecord,
            profilePicture,
            referrals: referralUserList,
            activity: {
              ...activity,
              firstTime: activity.lastLogin === '' ? true : false,
              eligibleDailyBonus: eligibleForDailyBonus ? true : false,
            },
            currentFarm,
            tasks: tasksList,
          },
        },
      }
    } catch (error) {
      sails.log.error(error)
      return {
        page: 'index',
        props: {
          user: null,
        },
      }
    }
  },
}
