const router = require('express').Router();
const multer = require('multer');

const { getShipToken } = require('../shipRocket/shipInstance');
const orderCtrl = require('../controllers/OrderCtrl/adminOrdersctrl');

const key = process.env.JWT_SECRET_ADMIN;

router.use(multer().any());

router.get('/auth', getShipToken);

router.post('/order/details', orderCtrl.shipOrderTrack);

module.exports = router;
