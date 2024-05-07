const router = require('express').Router();
const multer = require('multer');

const invCtrl = require('../../controllers/AdminCtrls/inventoryCtrl');
const validationCtrl = require('../../Models/inventory');
const authCtrl = require('../../controllers/authController');

router.use(multer().any());

router.get('/data', invCtrl.getinventories);

const key = process.env.JWT_SECRET_ADMIN;

router.use(authCtrl.protect(key));

router.post('/add', validationCtrl, invCtrl.addInvetroyLoation);

router.use(invCtrl.isInventoryExsit);
router
  .route('/')
  .post(invCtrl.getInventory)
  .put(validationCtrl, invCtrl.updateInventory)
  .patch(invCtrl.deleteInventory);

module.exports = router;
