const router = require('express').Router();
const multer = require('multer');

const productCtrl = require('../../controllers/ProductCtrl/addProductctrl');
const productDataCtrl = require('../../controllers/ProductCtrl/custstomerProdCtrl');
const productUpdateCtrl = require('../../controllers/ProductCtrl/editProduct');
const authCtrl = require('../../controllers/authController');
const editCtrl = require('../../controllers/ProductCtrl/editProduct');

const productModel = require('../../Models/Product');

router.post(
  '/collection-products',
  multer().any(),
  productDataCtrl.getCollectionProducts
);
router.post('/search', productDataCtrl.getProductsSerach);
router.post('/shop@99', productDataCtrl.shop99Products);
router.post('/bestseller', productDataCtrl.getBestSeller);

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
  productCtrl.skuVariantsProduct
);

router.post(
  '/add-info',
  productCtrl.uploadInfoImgs,
  productModel.productInfoValidation,
  productCtrl.storeIngImages,
  productCtrl.addInfo
);

router.post(
  '/update-store',
  productCtrl.uploadImage,
  productModel.productValidation,
  productCtrl.storeImage,
  productUpdateCtrl.updateProduct,
  productUpdateCtrl.skuvarientsUpdate
);

router.put(
  '/update/variant',
  editCtrl.updateVariantImage,
  productModel.variantValidation,
  editCtrl.isVariantExist,
  editCtrl.updateImage,
  editCtrl.variantUpdate
);

router.use(multer().any());

router.post('/get-info', productCtrl.getProductInfo);

router.delete(
  '/delete/variant',
  editCtrl.isVariantExist,
  editCtrl.deleteVariant
);

router.patch('/delete/images', productUpdateCtrl.deleteProductImages);

router.post('/all-products', productDataCtrl.getAllProducts);
router.get(
  '/all-products/variants',
  productDataCtrl.getAllProductsWithVariants
);

router.post(
  '/get/details',
  editCtrl.getProductDetails,
  editCtrl.getVariantsDetails
);

module.exports = router;
