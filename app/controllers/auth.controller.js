const { signupSchema, verifyOtpSchema, resendOtpSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../validations/auth.validation');
const dbHelper = require('../config/db.helper');
const response = require('../utils/response.helper');
const message = require('../utils/message.helper');
const emailHelper = require('../config/email.helper');
const common = require('../utils/common.helper');
const bcrypt = require('bcrypt');
const { generateToken } = require('../utils/jwt.helper');

exports.signup = async (req, res) => {
  const { error, value } = signupSchema.validate(req.body);
  if (error) return response.errorHandler(res, null, error.details[0].message);

  const { name, email, password, phone } = value;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = common.generateOTP();

    const inputParams = [
      { value: name },
      { value: email },
      { value: hashedPassword },
      { value: phone },
      { value: otp }
    ];

    await dbHelper.callStoredProcedure("SIGN_UP", inputParams);

    // Send OTP Email
    await emailHelper.sendEmailWithTemplate(email,'Verify Your Email','otpEmail',{ name, otp });

    return response.successHandler(res, null, message.SIGNUP_SUCCESS);
  } catch (err) {
    return response.errorHandler(res, null, err.message || 'Signup failed');
  }
};

exports.verifyOtp = async (req, res) => {
  const { error, value } = verifyOtpSchema.validate(req.body);
  if (error) return response.errorHandler(res, null, error.details[0].message);

  const { email, otp } = value;

  try {
    const inputParams = [
      { value: email },
      { value: otp }
    ];

    const result = await dbHelper.callStoredProcedure("VERIFY_OTP", inputParams);
    return response.successHandler(res, result[0][0], 'OTP verified');
  } catch (err) {
    return response.errorHandler(res, null, err.message);
  }
};

exports.resendOtp = async (req, res) => {
  const { error, value } = resendOtpSchema.validate(req.body);
  if (error) return response.errorHandler(res, null, error.details[0].message);

  const { email } = value;
  const otp = common.generateOTP();

  const inputParams = [
    { value: email },
    { value: otp }
  ];

  try {
    await dbHelper.callStoredProcedure("RESEND_OTP", inputParams);
    await emailHelper.sendEmailWithTemplate(email, 'Your OTP', 'otpEmail', { name: email, otp });
    return response.successHandler(res, null, 'OTP resent successfully.');
  } catch (err) {
    return response.errorHandler(res, null, err);
  }
};

exports.login = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return response.errorHandler(res, null, error.details[0].message);

    const { email, password } = value;

    const inputParams = [{ value: email }];

    const result = await dbHelper.callStoredProcedure('LOGIN_USER', inputParams);

    const user = result[0][0];

    if (!user) return response.errorHandler(res, null, 'Invalid email');

    // Check if user is active (assuming status_id 2 = active)
    if (user.status_id !== 2) {
      return response.errorHandler(res, null, 'Your account is not active. Please verify OTP first.');
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return response.errorHandler(res, null, 'Invalid password');

    const token = generateToken({ id: user.id, email: user.email });

    return response.successHandler(res, {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      type_id: user.type_id || null,
      token
    }, 'Login successful');
  } catch (err) {
    return response.errorHandler(res, null, err.message || err);
  }
};

exports.forgotPassword = async (req, res) => {
  const { error, value } = forgotPasswordSchema.validate(req.body);
  if (error) return response.errorHandler(res, null, error.details[0].message);

  const { email } = value;
  const otp = common.generateOTP();

  try {
    await dbHelper.callStoredProcedure("FORGOT_PASSWORD", [
      { value: email },
      { value: otp }
    ]);

    await emailHelper.sendEmailWithTemplate(email, 'Reset Password OTP', 'otpEmail', { email, otp });

    return response.successHandler(res, null, 'OTP sent to your email for password reset.');
  } catch (err) {
    return response.errorHandler(res, null, err);
  }
};

exports.resetPassword = async (req, res) => {
  const { error, value } = resetPasswordSchema.validate(req.body);
  if (error) return response.errorHandler(res, null, error.details[0].message);

  const { email, otp_code, password } = value;
  const hashedPassword = await bcrypt.hash(password, 10);

  const inputParams = [
    { value: email },
    { value: otp_code },
    { value: hashedPassword }
  ];

  try {
    const result = await dbHelper.callStoredProcedure("RESET_PASSWORD", inputParams);

    // Extract message from result
    const message = result?.[0]?.[0]?.message || 'Password reset successfully';
    return response.successHandler(res, null, message);
  } catch (err) {
    return res.status(200).json({
      status: 0,
      response: err.toString().replace('Error: ', '')
    });
  }
};
