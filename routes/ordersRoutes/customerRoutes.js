const router = require('express').Router();
const multer = require('multer');

const authCtrl = require('../../controllers/authController');
const ordersCtrl = require('../../controllers/OrderCtrl/gettAllOrders');
const addCtrl = require('../../controllers/OrderCtrl/addOrder');

router.use(multer().any());
const key = process.env.JWT_SECRET;

router.get('/estimate/date', addCtrl.getEstimateDate);

router.use(authCtrl.protect(key));

router.get('/all', ordersCtrl.getCustomerOrders);
router.post('/order/details', ordersCtrl.getOrderDetails);

module.exports = router;
