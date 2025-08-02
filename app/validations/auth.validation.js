const Joi = require('joi');

const signupSchema = Joi.object({
  name: Joi.string().min(3).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().pattern(/^[1-9][0-9]{9,14}$/).required()
});

const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required()
});

const resendOtpSchema = Joi.object({
  email: Joi.string().email().required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  otp_code: Joi.string().length(6).required(),
  password: Joi.string().min(8).required()
});

module.exports = { signupSchema, verifyOtpSchema, resendOtpSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema };
