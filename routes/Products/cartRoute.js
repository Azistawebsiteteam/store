const router = require('express').Router();
const authCtrl = require('../../controllers/authController');

const {
  getCartData,
  removeFromCart,
} = require('../../controllers/Cart/getProducts');

const addToCart = require('../../controllers/Cart/addProducts');
// Create the MySQL session store using the connection pool

router.route('/').post(addToCart);

const key = process.env.JWT_SECRET;

router.use(authCtrl.protect(key));

router.get('/data', getCartData);
router.patch('/data', removeFromCart);

module.exports = router;
