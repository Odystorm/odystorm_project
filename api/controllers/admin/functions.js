module.exports = {
  friendlyName: 'Admin Functions',

  description: 'Page with Admin Functions.',

  inputs: {},

  exits: {
    success: {
      responseType: 'inertia',
    },
  },

  fn: async function () {
    return {
      page: 'admin/index',
    }
  },
}
