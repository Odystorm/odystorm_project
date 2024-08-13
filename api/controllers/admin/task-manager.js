module.exports = {
  friendlyName: 'Task manager',

  description: '',

  inputs: {},

  exits: {
    success: {
      responseType: 'inertia',
    },
  },

  fn: async function (inputs) {
    return {
      page: 'admin/task-manager',
    }
  },
}
