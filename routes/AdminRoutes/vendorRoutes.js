const router = require('express').Router();

const vendorCtrl = require('../../controllers/AdminCtrls/vendorsCtrl');
const authCtrl = require('../../controllers/authController');

router.use(authCtrl.protect);

router.get('/details', vendorCtrl.getVendors);

router.post('/add', vendorCtrl.addVendor);

router.use(vendorCtrl.isVendeorExist);
router
  .route('/')
  .post(vendorCtrl.getVendor)
  .put(vendorCtrl.updateVendor)
  .patch(vendorCtrl.removeVendor);

module.exports = router;
