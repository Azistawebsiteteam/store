const express = require('express');
const validator = require('express-joi-validation').createValidator({});

const authControllers = require('../controllers/authController');

const registerSchema = require('../Middlewares/auth/Register');
const loginSchema = require('../Middlewares/auth/Login');

const router = express.Router();

router.post('/register', registerSchema, authControllers.signup);
router.post('/login', loginSchema, authControllers.login);

// // test route to verify if our middleware is working
// router.get('/test', auth, (req, res) => {
//   res.send('request passed');
// });

module.exports = router;
