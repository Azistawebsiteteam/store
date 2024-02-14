const router = require('express').Router();

const vendorCtrl = require('../../controllers/AdminCtrls/vendorsCtrl');
const authCtrl = require('../../controllers/authController');

router.use(authCtrl.protect);

router.get('/details', authCtrl.protect, vendorCtrl.getVendors);

module.exports = router;
