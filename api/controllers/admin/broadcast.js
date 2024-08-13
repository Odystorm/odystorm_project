module.exports = {
  friendlyName: 'Broadcast',

  description: 'Broadcast admin.',

  inputs: {},

  exits: {
    success: {
      responseType: 'inertia',
    },
  },

  fn: async function (inputs) {
    return {
      page: 'admin/broadcast',
    }
  },
}
