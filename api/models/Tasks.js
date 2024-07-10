/**
 * Tasks.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  attributes: {
    owner: {
      model: 'user',
    },
    title: {
      type: 'string',
      description: 'Task Title',
    },
    rewardAmount: {
      type: 'number',
      description: 'Token Reward Amount',
    },
    status: {
      type: 'string',
      description: 'Task Completion status',
      isIn: ['eligible', 'ineligible', 'unfinished', 'done'],
      defaultsTo: 'ineligible',
    },
    taskType: {
      type: 'string',
      isIn: ['milestone', 'social_following', 'ody_tasks'],
    },
    icon: {
      type: 'string',
      description: 'description of icon',
    },
  },
}
