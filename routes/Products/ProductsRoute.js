const router = require('express').Router();

const productCtrl = require('../../controllers/ProductCtrl/productCtrl');
const authCtrl = require('../../controllers/authController');

router.use(authCtrl.protect);

router.post(
  '/add-store',
  productCtrl.uploadImage,
  productCtrl.storeImage,
  productCtrl.addProduct,
  productCtrl.uploadProductImages,
  productCtrl.skuvarientsProduct,
  productCtrl.productDetails
);

module.exports = router;
