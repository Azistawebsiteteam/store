const router = require('express').Router();

const authCtrl = require('../../controllers/authController');
const getCartData = require('../../controllers/Cart/getProducts');

const addToCart = require('../../controllers/Cart/addProducts');

router.use(authCtrl.protect);

router.get('/data', getCartData);

router.route('/').post(addToCart);

module.exports = router;
