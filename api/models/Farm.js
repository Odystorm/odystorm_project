/**
 * Farm.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  attributes: {
    activity: {
      model: 'activity',
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
    status: {
      type: 'string',
      description: 'Current Farming Status',
      isIn: ['farming', 'farmed'],
      defaultsTo: 'farming',
    },
    tenMinuteReminded: {
      type: 'boolean',
      description: 'If Reminder is sent after 10 minutes',
      defaultsTo: false,
    },
    twelveHourReminded: {
      type: 'boolean',
      description: 'if Reminder is sent after 12 hours',
      defaultsTo: false,
    },
  },
}
