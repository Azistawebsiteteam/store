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
  registerCtrl.mobileSignup
);
router.post(
  '/register/verify-otp',

  registerCtrl.mobileSignupVerification,
  otpCtrl.verifyOTP,
  registerCtrl.mobileSignupInsert
);

router.post('/login', loginSchema, loginCtrl.login);

router.use(authControllers.protect);

router.post(
  '/reset-password',
  resetPasswordSchema,
  authControllers.resetPassword
);

module.exports = router;
