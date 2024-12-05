const router = require('express').Router();
const multer = require('multer');

const ordersCtrl = require('../../controllers/OrderCtrl/adminOrdersctrl');
const authCtrl = require('../../controllers/authController');
const cancelCtrl = require('../../controllers/OrderCtrl/cancellOrder');
const returnAndReplaceCrl = require('../../controllers/OrderCtrl/retunsOrder');
const { statusUpdateValidation } = require('../../Models/return');

const key = process.env.JWT_SECRET_ADMIN;

router.use(authCtrl.protect(key));
router.use(multer().any());

router.post('/all', ordersCtrl.getAllOrdrs);
router.post('/stats', ordersCtrl.getOrderStatics);
router.post('/confirm', ordersCtrl.confirmOrder);
router.post('/delivery', ordersCtrl.deliveryOrder);
router.post('/delivery/delay', ordersCtrl.delayDelivery);
router.post('/order/details', ordersCtrl.getOrderDetails);
router.get('/refund-request', returnAndReplaceCrl.getRefunRequestList);
router.post(
  '/refund-status/update',
  statusUpdateValidation,
  returnAndReplaceCrl.updateRefundStatus
);

router.post('/refund-payment', returnAndReplaceCrl.initiateRefundAdmin);

//router.post('/cancel-order', cancelCtrl.cancelOrder);

module.exports = router;
