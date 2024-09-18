const router = require('express').Router();
const multer = require('multer');

const discCtrl = require('../../controllers/DiscountCtrl/productDiscCtrl');

const authCtrl = require('../../controllers/authController');

const key = process.env.JWT_SECRET_ADMIN;

router.use(authCtrl.protect(key));
router.use(multer().any());

router.post('/create', discCtrl.createDiscount);

router
  .route('/')
  .get(discCtrl.getDiscounts)
  .post(discCtrl.discountDetails)
  .put(discCtrl.UpdateDiscount)
  .patch(discCtrl.deleteDiscount);

module.exports = router;
