const router = require('express').Router();
const multer = require('multer');

const validationCtrl = require('../../Models/inventory');
const authCtrl = require('../../controllers/authController');

const incLcCtrl = require('../../controllers/AdminCtrls/inventoryCtrl/locationsCtrl');
const invtQtyCtrl = require('../../controllers/AdminCtrls/inventoryCtrl/inventoryCtrl');

router.use(multer().any());

const key = process.env.JWT_SECRET_ADMIN;
router.get('/', incLcCtrl.getinventories);

router.use(authCtrl.protect(key));

router.get('/locations', incLcCtrl.getinventories);
router.post('/add-location', validationCtrl, incLcCtrl.addInvetroyLoation);
router.post('/add-product', invtQtyCtrl.addInventory);

router.post('/get/product-qty', invtQtyCtrl.getInventoryQty);
router.post('/update/product-qty', invtQtyCtrl.updateInventory);

router.use(incLcCtrl.isInventoryExsit);
router
  .route('/location')
  .post(incLcCtrl.getInventory)
  .put(validationCtrl, incLcCtrl.updateInventory)
  .patch(incLcCtrl.deleteInventory);

module.exports = router;
