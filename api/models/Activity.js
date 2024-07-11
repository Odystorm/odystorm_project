/**
 * Activity.js
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
    lastLogin: {
      type: 'string',
      description: 'Login Date',
    },
    noOfActiveDays: {
      type: 'number',
      description: 'No. Of Active Days',
      defaultsTo: 1,
    },
    currentlyFarming: {
      type: 'boolean',
      description: 'Currently Farming Status',
      defaultsTo: false,
    },
    currentFarmId: {
      type: 'string',
      description: 'ID of Current Farm Data',
    },
    farmLevel: {
      type: 'number',
      defaultsTo: 1,
    },
    currentNoOfFarmHours: {
      type: 'number',
      defaultsTo: 4,
      description: 'Current No Of Farms Hours',
    },
    eligibleClaimAmount: {
      type: 'number',
      description: 'Amount of Tokens Claimable at the end of Farming',
      defaultsTo: 0,
    },
    farming: {
      collection: 'farm',
      via: 'activity',
    },
  },
}
