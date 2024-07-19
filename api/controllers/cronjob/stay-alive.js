const { differenceInHours } = require('date-fns')

module.exports = {
  friendlyName: 'Stay alive',

  description: '',

  inputs: {},

  exits: {},

  fn: async function () {
    const { res } = this

    // Get All Farms that status are set to farming
    const farms = await Farm.find({
      status: 'farming',
    })

    if (farms.length > 0) {
      // Check all Farm Activities
      const farmCheck = await farms.map(async (farm) => {
        const today = Date.now()
        const endTime = farm.endTime

        const timeDifference = differenceInHours(today, endTime)
        if(timeDifference > 0){
          
        }
      })
    }

    return res
      .status(200)
      .json({ message: 'Successfully Ran Farm Reminder Cron Job' })
  },
}
