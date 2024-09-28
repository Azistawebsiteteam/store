const router = require('express').Router();
const multer = require('multer');
const authCtrl = require('../../controllers/authController');

const {
  getCartData,
  removeFromCart,
  abandonmentCart,
  getCartSimilarProducts,
} = require('../../controllers/Cart/getProducts');

const addToCartCtrl = require('../../controllers/Cart/addProducts');

const dscCtrl = require('../../controllers/DiscountCtrl/EligibleCrtl');
const dscApplyCtrl = require('../../controllers/DiscountCtrl/dscApplyCtrl');

router.use(multer().any());

// Customer Routes & Methods
router.get('/discount', dscCtrl.myDiscounts);
router
  .route('/')
  .post(addToCartCtrl.addProductToCart)
  .put(
    addToCartCtrl.handleProductQuantityUpdate,
    getCartData,
    getCartSimilarProducts,
    dscApplyCtrl.myDiscounts
  );

router.post(
  '/data',
  getCartData,
  getCartSimilarProducts,
  dscApplyCtrl.myDiscounts
);

router.patch('/data', removeFromCart);

const ukey = process.env.JWT_SECRET;

router.post(
  '/add/user',
  authCtrl.protect(ukey),
  addToCartCtrl.updateLocalToUser
);

// Admin routes handle

const key = process.env.JWT_SECRET_ADMIN;

router.use(authCtrl.protect(key));

router.post('/abandonment', abandonmentCart);

module.exports = router;
