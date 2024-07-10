/**
 * Day.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  attributes: {
    activity: {
      model: 'activity',
    },
    dailyBonusToken: {
      type: 'number',
      description: 'Daily Bonus',
      defaultsTo: 200,
    },
    dailyBonusTickets: {
      type: 'number',
      description: 'Tickets',
      defaultsTo: 3,
    },
    bonusStatus: {
      type: 'string',
      description: 'Bonus Claim Status',
      isIn: ['unclaimed', 'claimed'],
      defaultsTo: 'unclaimed',
    },
  },
}
