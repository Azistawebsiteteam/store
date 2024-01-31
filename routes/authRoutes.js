const express = require('express');

const registerCtrl = require('../controllers/Authentication/RegistrationCtrl');
const loginCtrl = require('../controllers/Authentication/LoginCtrl');
const authControllers = require('../controllers/authController');

const registerSchema = require('../Middlewares/auth/Register');
const loginSchema = require('../Middlewares/auth/Login');
const resetPasswordSchema = require('../Middlewares/auth/ResetPassword');

const router = express.Router();

router.post('/register', registerSchema, registerCtrl.signup);
router.post('/login', loginSchema, loginCtrl.login);

router.use(authControllers.protect);

router.post(
  '/reset-password',
  resetPasswordSchema,
  authControllers.resetPassword
);

module.exports = router;
