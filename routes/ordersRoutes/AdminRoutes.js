const router = require('express').Router();
const multer = require('multer');

const ordersCtrl = require('../../controllers/OrderCtrl/adminOrdersctrl');
const authCtrl = require('../../controllers/authController');

const key = process.env.JWT_SECRET_ADMIN;

router.use(authCtrl.protect(key));
router.use(multer().any());

router.post('/all', ordersCtrl.getAllOrdrs);
router.post('/confirm', ordersCtrl.confirmOrder, ordersCtrl.updateInventory);
router.post('/delivery', ordersCtrl.deliveryOrder);
router.post('/order/details', ordersCtrl.getOrderDetails);

module.exports = router;
