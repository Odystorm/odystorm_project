/**
 * Tasks.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  attributes: {
    title: {
      type: 'string',
      description: 'Task Title',
    },
    rewardAmount: {
      type: 'number',
      description: 'Token Reward Amount',
    },
    isCompleted: {
      type: 'boolean',
      description: 'Task Completion status',
      defaultsTo: false,
    },
    taskType: {
      type: 'string',
      isIn: ['milestone', 'social_following'],
    },
    icon:{
      type:'string',
      description:""
    }
  },
}
