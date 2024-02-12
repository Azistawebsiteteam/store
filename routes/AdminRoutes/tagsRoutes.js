const router = require('express').Router();

const tagsCtrl = require('../../controllers/AdminCtrls/tagsCtrl');
const authCtrl = require('../../controllers/authController');

router.use(authCtrl.protect);

router.get('/data', tagsCtrl.gettags);
router.post('/add', tagsCtrl.addtag);

router.use(tagsCtrl.istagexist);
router
  .route('/')
  .post(tagsCtrl.gettag)
  .put(tagsCtrl.updatetag)
  .patch(tagsCtrl.deletetag);

module.exports = router;
