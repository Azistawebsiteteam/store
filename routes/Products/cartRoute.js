const router = require('express').Router();
const multer = require('multer');
const authCtrl = require('../../controllers/authController');

const {
  getCartData,
  removeFromCart,
  abandonmentCart,
} = require('../../controllers/Cart/getProducts');

const addToCartCtrl = require('../../controllers/Cart/addProducts');

// Create the MySQL session store using the connection pool

router.use(multer().any());

router
  .route('/')
  .post(addToCartCtrl.addProductToCart)
  .put(addToCartCtrl.handleProductQuantityUpdate);

router.post('/data', getCartData);
router.patch('/data', removeFromCart);

// Admin routes handle

const key = process.env.JWT_SECRET_ADMIN;

router.use(authCtrl.protect(key));

router.post('/abandonment', abandonmentCart);

module.exports = router;
