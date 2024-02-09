const router = require('express').Router();

const collectionCtrl = require('../../controllers/AdminCtrls/collectionsCtrl');
const authCtrl = require('../../controllers/authController');

router.use(authCtrl.protect);

router.get('/data', collectionCtrl.collections);
router.post('/add', collectionCtrl.Addcollection);

router.use(collectionCtrl.isCollectionExit);
router
  .route('/')
  .post(collectionCtrl.getcollection)
  .put(collectionCtrl.updateCollection)
  .patch(collectionCtrl.deleteCollection);

module.exports = router;
