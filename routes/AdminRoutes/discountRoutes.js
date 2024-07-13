const router = require('express').Router();
const multer = require('multer');

const discCtrl = require('../../controllers/DiscountCtrl/crudCtrl');
const xyDiscCtrl = require('../../controllers/DiscountCtrl/buyXgetYCtrl');
const disSchemaCtrl = require('../../Models/disscount');

const authCtrl = require('../../controllers/authController');

const key = process.env.JWT_SECRET_ADMIN;

router.use(authCtrl.protect(key));
router.use(multer().any());

router.post(
  '/create',
  disSchemaCtrl.validateDiscount,
  discCtrl.createDisscount
);

router.post(
  '/xy/create',
  disSchemaCtrl.validateXYDiscount,
  xyDiscCtrl.createDiscount
);

router
  .route('/')
  .get(discCtrl.getDiscounts)
  .post(discCtrl.discountDetails)
  .put(disSchemaCtrl.validateDiscount, discCtrl.UpdateDiscount)
  .patch(discCtrl.deleteDiscount);

router.get('/xy', xyDiscCtrl.getDiscounts); // Handle GET requests to /xy
router.use(xyDiscCtrl.isExist); // Middleware for checking existence
router
  .route('/xy')
  .post(xyDiscCtrl.getDiscount) // Handle POST requests to /xy
  .put(disSchemaCtrl.validateXYDiscount, xyDiscCtrl.updateDiscount) // Handle PUT requests to /xy with validation
  .patch(xyDiscCtrl.deleteDiscount); // Handle PATCH requests to /xy

module.exports = router;
