const router = require('express').Router();
const multer = require('multer');

const authCtrl = require('../../controllers/authController');
const ordersCtrl = require('../../controllers/OrderCtrl/adminOrdersctrl');
const orderAddCtrl = require('../../controllers/OrderCtrl/addOrder');
const razorpayCtrl = require('../../controllers/OrderCtrl/razorpay');

router.use(multer().any());
const key = process.env.JWT_SECRET;

router.post('/estimate/date', orderAddCtrl.getEstimateDate);

router.use(authCtrl.protect(key));

router.post('/creat-payment', razorpayCtrl.razorPayCreateOrder);
router.post('/validate-payment', razorpayCtrl.razorPayValidatePayment);

router.post(
  '/place-order',
  orderAddCtrl.placeOrder,
  orderAddCtrl.orderInfo,
  orderAddCtrl.orderSummary
);

router.get('/payment/:paymentId', razorpayCtrl.rezorpayPayment);

// Route to download the invoice
router.get('/invoice/download/:orderId', orderAddCtrl.downloadInvoice);

// Route to view the invoice in the browser
router.get('/invoice/view/:orderId', orderAddCtrl.viewInvoice);

router.get('/all', ordersCtrl.getCustomerOrders);
router.post('/order/details', ordersCtrl.getOrderDetails);

module.exports = router;
