const express = require('express');

const authCtrl = require('../../controllers/authController');
const addressCtrl = require('../../controllers/CustomerCtrls/adderessController');

const addressValidation = require('../../Models/address');

const router = express.Router();

router.use(authCtrl.protect);

router.post('/add/newaddress', addressValidation, addressCtrl.createNewAddress);
router.post('/myaddresses', addressCtrl.getMyAddresses);
router.post(
  '/getaddress',
  addressCtrl.isAddressExisit,
  addressCtrl.getAddressDetails
);
router.post(
  '/make/default-address',
  addressCtrl.isAddressExisit,
  addressCtrl.makeAddressDefault
);

router.put(
  '/update/address',
  addressValidation,
  addressCtrl.isAddressExisit,
  addressCtrl.updateAddress
);

router.post('/delete', addressCtrl.isAddressExisit, addressCtrl.deleteAddress);

module.exports = router;
