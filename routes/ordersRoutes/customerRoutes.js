const router = require('express').Router();
const multer = require('multer');

const orderModel = require('../../Models/order');
const { returnValidation } = require('../../Models/return');

const authCtrl = require('../../controllers/authController');
const ordersCtrl = require('../../controllers/OrderCtrl/adminOrdersctrl');
const cancelCtrl = require('../../controllers/OrderCtrl/cancellOrder');
const returnAndReplaceCrl = require('../../controllers/OrderCtrl/retunsOrder');

const orderDetails = require('../../controllers/OrderCtrl/OrdersDetails');
const createOrderCtrl = require('../../controllers/OrderCtrl/createOrder');
const razorpayCtrl = require('../../controllers/OrderCtrl/razorpay');

router.use(multer().any());
const key = process.env.JWT_SECRET;

router.post('/estimate/date', orderDetails.getEstimateDate);

router.use(authCtrl.protect(key));

router.post('/creat-payment', razorpayCtrl.razorPayCreateOrder);
router.post('/validate-payment', razorpayCtrl.razorPayValidatePayment);

router.post('/place-order', orderModel, createOrderCtrl.placeOrder);

router.post('/order-summary', orderDetails.getOrderSummary);
router.get('/payment/:paymentId', razorpayCtrl.rezorpayPayment);

router.post('/cancel-order', cancelCtrl.cancelOrder);
router.post(
  '/return-order',
  returnAndReplaceCrl.isOrderDelivered,
  returnValidation,
  returnAndReplaceCrl.returnOrder
);
router.get('/refund-requests', returnAndReplaceCrl.getMyRefunRequestList);
router.get('/all', ordersCtrl.getCustomerOrders);
router.post('/order/details', ordersCtrl.getOrderDetails);

module.exports = router;
