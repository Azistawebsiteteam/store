const router = require('express').Router();
const multer = require('multer');

const authCtrl = require('../../controllers/authController');
const ordersCtrl = require('../../controllers/OrderCtrl/gettAllOrders');
const orderAddCtrl = require('../../controllers/OrderCtrl/addOrder');

router.use(multer().any());
const key = process.env.JWT_SECRET;

router.post('/estimate/date', orderAddCtrl.getEstimateDate);

router.use(authCtrl.protect(key));
// Route to download the invoice
router.get('/invoice/download/:orderId', orderAddCtrl.downloadInvoice);

// Route to view the invoice in the browser
router.get('/invoice/view/:orderId', orderAddCtrl.viewInvoice);

router.post('/create/order', orderAddCtrl.addedOrder);
router.get('/all', ordersCtrl.getCustomerOrders);
router.post('/order/details', ordersCtrl.getOrderDetails);

module.exports = router;
