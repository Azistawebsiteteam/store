const router = require('express').Router();
const multer = require('multer');

const cbCtrl = require('../controllers/callBackCtrl');
const validationCtrl = require('../Models/callBack');
const authCtrl = require('../controllers/authController');

router.use(multer().any());

router.post('/', validationCtrl.vallidateCallback, cbCtrl.createCallBack);
router.post('/query', validationCtrl.validateQuery, cbCtrl.createCusQuery);

const key = process.env.JWT_SECRET_ADMIN;

router.use(authCtrl.protect(key));

router
  .route('/')
  .get(cbCtrl.getCallBacks)
  .put(cbCtrl.resovleCb)
  .patch(cbCtrl.deleteCallback);

router
  .route('/query')
  .get(cbCtrl.getCusQuery)
  .put(cbCtrl.resovleQuery)
  .patch(cbCtrl.deleteQuery);

module.exports = router;
