const Joi = require('joi');

exports.createThreadSchema = Joi.object({
  otherUserId: Joi.number().required()
});

exports.sendMessageSchema = Joi.object({
  threadId: Joi.number().required(),
  messageType: Joi.string().valid('text', 'file').required(),
  content: Joi.string().required()
});
