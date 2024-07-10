/**
 * Currency.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  attributes: {
    tokenName: {
      type: 'string',
      description: 'Name of in-game currency',
      isIn: ['greendragon', 'dragon-egg'],
    },
    amount: {
      type: 'number',
      description: 'Amount of Token Owned',
      defaultsTo: 0,
    },
  },
}
