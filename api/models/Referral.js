/**
 * Referral.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  attributes: {
    owner:{
      model:"user"
    },
    user:{
      type:'json',
      description:"User Referred"
    }
  },
};

