const express = require('express');

const authCtrl = require('../../controllers/authController');
const addressCtrl = require('../../controllers/CustomerCtrls/adderessController');

const addressValidation = require('../../Middlewares/validations/address');

const router = express.Router();

router.use(authCtrl.protect);

router.post('/add/newaddress', addressValidation, addressCtrl.createNewAddress);
router.post('/myaddresses', addressCtrl.getMyAddresses);
router.post(
  '/make/default-address',
  addressCtrl.isAddressExit,
  addressCtrl.makeAddressDefault
);

router.post('/delete', addressCtrl.isAddressExit, addressCtrl.deleteAddress);

module.exports = router;
