const router = require('express').Router();
const multer = require('multer');

const discCtrl = require('../../controllers/DiscountCtrl/EligibleCrtl');
const dscApplyCtrl = require('../../controllers/DiscountCtrl/dscApplyCtrl');

const { getCartData } = require('../../controllers/Cart/getProducts');

const authCtrl = require('../../controllers/authController');

const key = process.env.JWT_SECRET;

router.use(authCtrl.protect(key));
router.use(multer().any());

router.post('/', discCtrl.getEligibleDiscounts);
router.post(
  '/apply',
  dscApplyCtrl.applyDiscountByCode,
  getCartData,
  dscApplyCtrl.myDiscounts
);

module.exports = router;
