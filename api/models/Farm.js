/**
 * Farm.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  attributes: {
    owner: {
      model: 'activity',
    },
    farmSessionId: {
      type: 'string',
      description: 'Farm Session ID',
      example: 'V1StGXR8_Z5jdHi6B-myT',
    },
    startTime: {
      type: 'number',
      description: 'Start Time in Timestamp format',
    },
    endTime: {
      type: 'number',
      description: 'End Time in Timestamp format',
    },
    hours: {
      type: 'number',
      description: 'Number of Farm Hours',
    },
    increment: {
      type: 'number',
      description: 'Score Level',
    },
    eligibleClaimAmount: {
      type: 'number',
      description: 'Saved Score',
      allowNull: true,
    },
  },
}
