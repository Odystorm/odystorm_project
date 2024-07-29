const { parseISO, isToday } = require('date-fns')

module.exports = {
  friendlyName: 'Leaderboard',

  description: 'Leaderboard ranks.',

  inputs: {},

  exits: {},

  fn: async function (inputs) {
    const { res } = this

    // Get Total No. Of Farm Sessions
    const farms = await Farm.find({})
    const farmed = await Farm.find({ status: 'farmed' })

    // Get Accounts of Highest Earners
    const wallets = await Wallet.find({})

    // Total Earnings
    const getTotalEarnings = (sessions) => {
      return sessions.reduce(
        (sum, session) => sum + session.eligibleClaimAmount,
        0
      )
    }

    // Total No Of Users
    const users = await User.find({})

    // Filter Users that Reported Today
    const allUserActivity = await Activity.find({})
    const loggedInToday = allUserActivity.filter(
      (userActivity) =>
        userActivity.lastLogin !== '' &&
        isToday(parseISO(userActivity.lastLogin))
    )

    return res.status(200).json({
      totalMined: getTotalEarnings(farmed),
      noOfMineSessions: farms.length,
      armyTotal: users.length,
      reportedToday: loggedInToday.length,
    })
  },
}
