const router = require('express').Router();

const productCtrl = require('../../controllers/ProductCtrl/productaddCtrl');
const productDataCtrl = require('../../controllers/ProductCtrl/productDetailsCtrl');
const authCtrl = require('../../controllers/authController');
const editCtrl = require('../../controllers/ProductCtrl/editProduct');

const productValidationCtrl = require('../../Models/Product');

const {
  isExistInWl,
  addToWl,
  removeFromWl,
  getWhishlist,
} = require('../../controllers/wishLIstCtrl');

router.post('/search', productDataCtrl.getProductsSerach);

router.post('/collection-products', productDataCtrl.getCollectionProducts);

router.post('/details', productDataCtrl.getProductDetalis);
router.post('/variants', productDataCtrl.getProductVariant);

const key = process.env.JWT_SECRET_ADMIN;

//  productCtrl.uploadProductImages,  productCtrl.productDetails

router.use(authCtrl.protect(key));
//router.post('/add-store', productCtrl.skuvarientsProduct);
router.post(
  '/add-store',
  productCtrl.uploadImage,
  productValidationCtrl,
  productCtrl.storeImage,
  productCtrl.addProduct,
  productCtrl.skuvarientsProduct
);

router.post(
  '/add-variant',
  productCtrl.uploadImage,
  productCtrl.storeImage,
  productCtrl.skuvarientsProduct
);

router.post('/all-products', productDataCtrl.getAllProducts);

router.post('/get/details', editCtrl.getProductDetalis);

router.post('/whish-list', getWhishlist);
router.post('/add-wl', isExistInWl, addToWl);
router.post('/remove-wl', removeFromWl);

module.exports = router;
