const router = require('express').Router();
const multer = require('multer');

const orderModel = require('../../Models/order');

const authCtrl = require('../../controllers/authController');
const ordersCtrl = require('../../controllers/OrderCtrl/adminOrdersctrl');
const cancelCtrl = require('../../controllers/OrderCtrl/cancellOrder');
const orderAddCtrl = require('../../controllers/OrderCtrl/addOrder');
const createOrderCtrl = require('../../controllers/OrderCtrl/createOrder');
const razorpayCtrl = require('../../controllers/OrderCtrl/razorpay');

router.use(multer().any());
const key = process.env.JWT_SECRET;

router.post('/estimate/date', orderAddCtrl.getEstimateDate);

router.use(authCtrl.protect(key));

router.post('/creat-payment', razorpayCtrl.razorPayCreateOrder);
router.post('/validate-payment', razorpayCtrl.razorPayValidatePayment);

// router.post(
//   '/place-order',
//   orderModel,
//   orderAddCtrl.placeOrder,
//   orderAddCtrl.orderInfo,
//   orderAddCtrl.orderSummary
// );

router.post('/place-order', orderModel, createOrderCtrl.placeOrder);

//  orderAddCtrl.orderInfo,
// orderAddCtrl.orderSummary

router.post('/order-summary', orderAddCtrl.getOrderSummary);
router.get('/payment/:paymentId', razorpayCtrl.rezorpayPayment);

router.post('/cancel-order', cancelCtrl.cancelOrder);

// Route to download the invoice
//router.get('/invoice/download/:orderId', orderAddCtrl.downloadInvoice);

// Route to view the invoice in the browser
//router.get('/invoice/view/:orderId', orderAddCtrl.viewInvoice);

router.get('/all', ordersCtrl.getCustomerOrders);
router.post('/order/details', ordersCtrl.getOrderDetails);

module.exports = router;
