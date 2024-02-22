const router = require('express').Router();

const productCtrl = require('../../controllers/ProductCtrl/productaddCtrl');
const productDataCtrl = require('../../controllers/ProductCtrl/productDetailsCtrl');
const authCtrl = require('../../controllers/authController');

const {
  isExistInWl,
  addToWl,
  removeFromWl,
  getWhishlist,
} = require('../../controllers/wishLIstCtrl');

router.post('/collection-products', productDataCtrl.getCollectionProducts);

router.post('/details', productDataCtrl.getProductDetalis);

const key = process.env.JWT_SECRET;

router.use(authCtrl.protect(key));

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

router.post('/whish-list', getWhishlist);
router.post('/add-wl', isExistInWl, addToWl);
router.post('/remove-wl', removeFromWl);

module.exports = router;
