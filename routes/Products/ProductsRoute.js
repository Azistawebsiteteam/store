const router = require('express').Router();

const productCtrl = require('../../controllers/ProductCtrl/productaddCtrl');
const productDataCtrl = require('../../controllers/ProductCtrl/productDetailsCtrl');
const authCtrl = require('../../controllers/authController');
const editCtrl = require('../../controllers/ProductCtrl/editProduct');

const productModel = require('../../Models/Product');

const {
  isExistInWl,
  addToWl,
  removeFromWl,
  getWhishlist,
} = require('../../controllers/wishLIstCtrl');

router.post('/collection-products', productDataCtrl.getCollectionProducts);
router.post('/search', productDataCtrl.getProductsSerach);

router.post('/details', productDataCtrl.getProductDetalis);
router.post('/variants', productDataCtrl.getProductVariant);

const key = process.env.JWT_SECRET_ADMIN;

router.use(authCtrl.protect(key));

router.post(
  '/add-store',
  productCtrl.uploadImage,
  productModel.productValidation,
  productCtrl.storeImage,
  productCtrl.addProduct,
  productCtrl.skuvarientsProduct
);

router.put(
  '/update/variant',
  editCtrl.updateVariantImage,
  productModel.variantValidation,
  editCtrl.isVariantExist,
  editCtrl.updateImage,
  editCtrl.variantUpdate
);

router.delete(
  '/delete/variant',
  editCtrl.isVariantExist,
  editCtrl.deleteVariant
);

router.post('/all-products', productDataCtrl.getAllProducts);
router.post('/get/details', editCtrl.getProductDetalis);

router.post('/whish-list', getWhishlist);
router.post('/add-wl', isExistInWl, addToWl);
router.post('/remove-wl', removeFromWl);

module.exports = router;
