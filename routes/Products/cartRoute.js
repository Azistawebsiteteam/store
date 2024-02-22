const router = require('express').Router();

const authCtrl = require('../../controllers/authController');
const getCartData = require('../../controllers/Cart/getProducts');

const addToCart = require('../../controllers/Cart/addProducts');

const key = process.env.JWT_SECRET;

router.use(authCtrl.protect(key));

router.get('/data', getCartData);

router.route('/').post(addToCart);

module.exports = router;
