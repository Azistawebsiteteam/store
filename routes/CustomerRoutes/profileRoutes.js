const router = require('express').Router();

const {
  profileValidation,
  billingValidation,
} = require('../../Models/profile');

const authController = require('../../controllers/authController');
const profileCtrl = require('../../controllers/CustomerCtrls/ProfileCtrl');

const key = process.env.JWT_SECRET;

router.use(authController.protect(key));

router.post('/data', profileCtrl.isUserExist, profileCtrl.getCustomer);

router.post(
  '/update',
  profileValidation,
  profileCtrl.isUserExist,
  profileCtrl.updateProfile
);

router.post(
  '/update/billing-address',
  billingValidation,
  profileCtrl.isUserExist,
  profileCtrl.updateBillingAddress
);

module.exports = router;
