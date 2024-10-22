const express = require('express');
const multer = require('multer');

const registerCtrl = require('../../controllers/CustomerCtrls/Authentication/RegistrationCtrl');
const loginCtrl = require('../../controllers/CustomerCtrls/Authentication/LoginCtrl');
const authControllers = require('../../controllers/authController');
const otpCtrl = require('../../controllers/otpController');

const registerSchema = require('../../Models/Register');
const loginSchema = require('../../Models/Login');
const resetPasswordSchema = require('../../Models/ResetPassword');

const router = express.Router();

router.use(multer().any());

router.post(
  '/register',
  registerSchema,
  registerCtrl.checkExistingUser,
  registerCtrl.signup
);

router.post(
  '/register/otp',
  registerCtrl.validateMobileSingup,
  registerCtrl.checkExistingUser,
  registerCtrl.mobileSignup,
  otpCtrl.sendOtp
);

router.post(
  '/register/verify-otp',
  otpCtrl.checkOtpExisting,
  otpCtrl.updateOtpDetails
);

router.post('/register/details', registerCtrl.updateUserData);

router.post('/login', loginSchema, loginCtrl.isUserExisit, loginCtrl.login);
router.post('/login/google', loginCtrl.isUserExisit, loginCtrl.googleLogin);

router.post(
  '/login/otp',
  loginCtrl.isUserExisit,
  loginCtrl.otpLogin,
  otpCtrl.sendOtp
);

router.post(
  '/login/verify-otp',
  loginCtrl.isUserExisit,
  otpCtrl.checkOtpExisting,
  otpCtrl.updateOtpDetails
);

router.post(
  '/forgot-password',
  loginCtrl.isUserExisit,
  loginCtrl.forgotPassword,
  otpCtrl.sendOtp
);

router.post(
  '/forgot-password/verifyotp',
  loginCtrl.isUserExisit,
  otpCtrl.checkOtpExisting,
  otpCtrl.updateOtpDetails,
  authControllers.forgotPassword
);

router.post('/newsletter/subscribe', registerCtrl.subscribeNewLetter);

const key = process.env.JWT_SECRET;

router.use(authControllers.protect(key));

router.post(
  '/reset-password',
  resetPasswordSchema,
  authControllers.resetPassword
);

router.post('/details/otp-register', registerCtrl.otpSignupDetails);

router.post('/delete/account', registerCtrl.deleteAccount);

router.post('/logout', loginCtrl.logout);

module.exports = router;
