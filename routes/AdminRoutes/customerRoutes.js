const router = require('express').Router();
const multer = require('multer');
const customerCtrl = require('../../controllers/AdminCtrls/customersCtrl');
const userCtrl = require('../../controllers/CustomerCtrls/ProfileCtrl');
const authCtrl = require('../../controllers/authController');

const key = process.env.JWT_SECRET_ADMIN;
router.use(multer().any());
router.use(authCtrl.protect(key));

router.post('/get/all', customerCtrl.getAllCustomers);
router.post(
  '/get/details',
  userCtrl.isUserExist,
  customerCtrl.getUserDetailsAndLastOrder
);
router.post('/get/orders', userCtrl.getMyOrders);
router.post('/user/disable', customerCtrl.disableCustomer);
router.delete('/user/delete', customerCtrl.disableCustomer);

module.exports = router;
