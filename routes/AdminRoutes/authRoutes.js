const express = require('express');

const loginCtrl = require('../../controllers/AdminCtrls/Authentication/Login');
const signupCtrl = require('../../controllers/AdminCtrls/Authentication/signup');
const authCtrl = require('../../controllers/authController');

const router = express.Router();

router.post(
  '/register',
  signupCtrl.uploadImage,
  signupCtrl.checkExistingUser,
  signupCtrl.storeImage,
  signupCtrl.createAccount
);
router.post('/login', loginCtrl.isAdminExisit, loginCtrl.login);

const key = process.env.JWT_SECRET_ADMIN;

router.use(authCtrl.protect(key));

router.post('/get/admin', loginCtrl.isAdminExisit, loginCtrl.getAdminDetails);

router.post(
  '/update/details',
  loginCtrl.isAdminExisit,
  signupCtrl.uploadImage,
  signupCtrl.updateImage,
  signupCtrl.updateDetails
);

router.post('/reset-password', loginCtrl.resetPassword);

module.exports = router;
