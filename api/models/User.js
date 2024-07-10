/**
 * User.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  attributes: {
    firstName: {
      type: 'string',
      required: true,
      description: "User's First Name",
      example: 'John',
    },
    lastName: {
      type: 'string',
      description: "User's Last Name",
      example: 'Doe',
    },
    username: {
      type: 'string',
      required: true,
      description: "User's Telegram Username",
      example: 'Telegram Username, e.g. @timmythenerd',
    },
    profilePicture: {
      type: 'string',
      description: 'Profile Picture',
      allowNull: true,
    },
    chatId: {
      type: 'string',
      description: '',
    },
    referrer: {
      type: 'string',
      defaultsTo: '',
    },
    referralId: {
      type: 'string',
      description: 'referral Id',
    },
    wallet: {
      collection: 'wallet',
      via: 'owner',
    },
    referrals: {
      collection: 'referral',
      via: 'owner',
    },
    activity: {
      collection: 'referral',
      via: 'owner',
    },
    stats: {
      collection: 'stats',
      via: 'owner',
    },
  },
}
