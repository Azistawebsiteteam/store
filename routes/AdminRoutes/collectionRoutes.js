const router = require('express').Router();

const collectionCtrl = require('../../controllers/AdminCtrls/collectionsCtrl');
const authCtrl = require('../../controllers/authController');

router.get('/data', collectionCtrl.collections);

const key = process.env.JWT_SECRET_ADMIN;

router.use(authCtrl.protect(key));

router.post(
  '/add',
  collectionCtrl.uploadImage,
  collectionCtrl.storeImage,
  collectionCtrl.Addcollection
);

router.put(
  '/',
  collectionCtrl.uploadImage,
  collectionCtrl.isCollectionExist,
  collectionCtrl.updateImage,
  collectionCtrl.updateCollection
);

router.use(collectionCtrl.isCollectionExist);

router
  .route('/')
  .post(collectionCtrl.getcollection)
  .patch(collectionCtrl.deleteCollection);

module.exports = router;
