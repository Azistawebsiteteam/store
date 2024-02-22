const router = require('express').Router();

const vendorCtrl = require('../../controllers/AdminCtrls/vendorsCtrl');
const authCtrl = require('../../controllers/authController');

const key = process.env.JWT_SECRET_ADMIN;

router.use(authCtrl.protect(key));

router.get('/details', vendorCtrl.getVendors);

router.post('/add', vendorCtrl.addVendor);

router.use(vendorCtrl.isVendeorExist);
router
  .route('/')
  .post(vendorCtrl.getVendor)
  .put(vendorCtrl.updateVendor)
  .patch(vendorCtrl.removeVendor);

module.exports = router;
