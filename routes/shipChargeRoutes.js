const router = require('express').Router();
const multer = require('multer');

const authCtrl = require('../controllers/authController');
const chargeCtrl = require('../controllers/Cart/shippingCharges');

router.use(multer().any());
router.get('/free', chargeCtrl.freeCharges);
const key = process.env.JWT_SECRET_ADMIN;
router.use(authCtrl.protect(key));

router
  .route('/')
  .get(chargeCtrl.allCharges)
  .post(chargeCtrl.checkDulicateCharge, chargeCtrl.addCharge)
  .put(chargeCtrl.checkDulicateCharge, chargeCtrl.updateCharge)
  .patch(chargeCtrl.deleteCharge);

module.exports = router;
