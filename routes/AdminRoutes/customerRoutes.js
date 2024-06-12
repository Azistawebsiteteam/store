const router = require('express').Router();
const multer = require('multer');
const customerCtrl = require('../../controllers/AdminCtrls/customersCtrl');
const userCtrl = require('../../controllers/CustomerCtrls/ProfileCtrl');
const authCtrl = require('../../controllers/authController');

const key = process.env.JWT_SECRET_ADMIN;
router.use(multer().any());
router.use(authCtrl.protect(key));

router.post('/get/all', customerCtrl.getAllCusters);
router.post('/get/details', userCtrl.isUserExist, userCtrl.getCustomer);

module.exports = router;
