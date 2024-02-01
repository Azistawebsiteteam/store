const express = require('express');

const registerCtrl = require('../controllers/Authentication/RegistrationCtrl');
const loginCtrl = require('../controllers/Authentication/LoginCtrl');
const authControllers = require('../controllers/authController');
const otpCtrl = require('../controllers/otpController');

const registerSchema = require('../Middlewares/auth/Register');
const loginSchema = require('../Middlewares/auth/Login');
const resetPasswordSchema = require('../Middlewares/auth/ResetPassword');

const router = express.Router();

router.post(
  '/register',
  registerSchema,
  registerCtrl.checkExistingUser,
  registerCtrl.signup
);
router.post(
  '/register/otp',
  registerCtrl.checkExistingUser,
  registerCtrl.mobileSignup,
  otpCtrl.sendOtp
);
router.post(
  '/register/verify-otp',
  otpCtrl.checkOtpExisting,
  otpCtrl.verifyOTP,
  registerCtrl.mobileSignupInsert,
  otpCtrl.updateOtpDetails
);

router.post('/login', loginSchema, loginCtrl.isUserExist, loginCtrl.login);
router.post(
  '/login/otp',
  loginCtrl.isUserExist,
  loginCtrl.otpLogin,
  otpCtrl.sendOtp
);

router.post(
  '/login/verify-otp',
  loginCtrl.isUserExist,
  otpCtrl.checkOtpExisting,
  otpCtrl.verifyOTP,
  otpCtrl.updateOtpDetails
);

router.post(
  '/forgot-password',
  loginCtrl.isUserExist,
  loginCtrl.forgotPassword,
  otpCtrl.sendOtp
);
router.post(
  '/forgot-password/verifyotp',
  loginCtrl.isUserExist,
  otpCtrl.checkOtpExisting,
  otpCtrl.verifyOTP,
  authControllers.forgotPassword
);

router.use(authControllers.protect);

router.post(
  '/reset-password',
  resetPasswordSchema,
  authControllers.resetPassword
);

router.post('/logout', loginCtrl.logout);

module.exports = router;
