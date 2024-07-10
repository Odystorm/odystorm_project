module.exports = {
  friendlyName: 'Home',

  description: 'Home index.',

  inputs: {},

  exits: {
    success: {
      responseType: 'inertia',
    },
  },

  fn: async function () {
    const { req } = this
    sails.log.info(req.url)

    return {
      page: 'index',
      props: {
        name: 'OdyStorm Token',
      },
    }
  },
}
