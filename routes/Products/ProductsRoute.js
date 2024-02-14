const router = require('express').Router();

const productCtrl = require('../../controllers/ProductCtrl/productaddCtrl');
const productDataCtrl = require('../../controllers/ProductCtrl/productDetailsCtrl');
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

router.post('/collection-products', productDataCtrl.getCollectionProducts);

module.exports = router;
