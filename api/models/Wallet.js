/**
 * Wallet.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  attributes: {
    owner: {
      model: 'user',
      unique: true,
    },
    balance: {
      type: 'number',
      description: 0,
      defaultsTo: 100,
    },
  },
}
