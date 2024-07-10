module.exports = {
  friendlyName: 'Gen referral code',

  description: '',

  inputs: {},

  exits: {
    success: {
      description: 'All done.',
    },
  },

  fn: async function () {
    var code = ''
    var charset = 'ABCDEFGHIJKLMONPQRSTUVWXYZ0123456789'

    for (var i = 0; i < 6; i++)
      code += charset.charAt(Math.floor(Math.random() * charset.length))
    return code
  },
}
