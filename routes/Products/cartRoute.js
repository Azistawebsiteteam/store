const router = require('express').Router();
const multer = require('multer');
const authCtrl = require('../../controllers/authController');

const {
  getCartData,
  removeFromCart,
  abandonmentCart,
} = require('../../controllers/Cart/getProducts');

const addToCartCtrl = require('../../controllers/Cart/addProducts');

const dscCtrl = require('../../controllers/DiscountCtrl/EligibleCrtl');

router.use(multer().any());

// Customer Routes & Methods
router.get('/discount', dscCtrl.myDiscounts);
router
  .route('/')
  .post(addToCartCtrl.addProductToCart)
  .put(addToCartCtrl.handleProductQuantityUpdate);

router.post('/data', getCartData);
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
