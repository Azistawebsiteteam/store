const router = require('express').Router();
const multer = require('multer');

const authCtrl = require('../../controllers/authController');
const ordersCtrl = require('../../controllers/OrderCtrl/gettAllOrders');

const key = process.env.JWT_SECRET;

router.use(authCtrl.protect(key));

router.use(multer().any());

router.get('/all', ordersCtrl.getCustomerOrders);
router.post('/order/details', ordersCtrl.getOrderDetails);

module.exports = router;
