const router = require('express').Router();

const productCtrl = require('../../controllers/ProductCtrl/productaddCtrl');
const productDataCtrl = require('../../controllers/ProductCtrl/productDetailsCtrl');
const authCtrl = require('../../controllers/authController');

router.post('/collection-products', productDataCtrl.getCollectionProducts);

router.post('/details', productDataCtrl.getProductDetalis);

router.use(authCtrl.protect);

//  productCtrl.uploadProductImages,

router.post(
  '/add-store',
  productCtrl.uploadImage,
  productCtrl.storeImage,
  productCtrl.addProduct,
  productCtrl.productDetails
);

router.post(
  '/add-variant',
  productCtrl.uploadImage,
  productCtrl.storeImage,
  productCtrl.skuvarientsProduct
);

module.exports = router;
