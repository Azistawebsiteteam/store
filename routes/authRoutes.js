const express = require('express');

const authControllers = require('../controllers/authController');

const registerSchema = require('../Middlewares/auth/Register');
const loginSchema = require('../Middlewares/auth/Login');
const resetPasswordSchema = require('../Middlewares/auth/ResetPassword');

const router = express.Router();

router.post('/register', registerSchema, authControllers.signup);
router.post('/login', loginSchema, authControllers.login);

router.post(
  '/reset-password',
  resetPasswordSchema,
  authControllers.protect,
  authControllers.resetPassword
);

// // test route to verify if our middleware is working
// router.get('/test', auth, (req, res) => {
//   res.send('request passed');
// });

module.exports = router;
