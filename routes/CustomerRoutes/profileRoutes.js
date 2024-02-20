const router = require('express').Router();

const profileValidation = require('../../Models/profile');

const authController = require('../../controllers/authController');
const profileCtrl = require('../../controllers/CustomerCtrls/ProfileCtrl');

router.use(authController.protect);

router.post('/data', profileCtrl.isUserExist, profileCtrl.getCustomer);
router.post(
  '/update',
  profileValidation,
  profileCtrl.isUserExist,
  profileCtrl.updateProfile
);

module.exports = router;
