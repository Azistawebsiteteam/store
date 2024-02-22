const router = require('express').Router();

const tagsCtrl = require('../../controllers/AdminCtrls/tagsCtrl');
const authCtrl = require('../../controllers/authController');

router.get('/data', tagsCtrl.gettags);

const key = process.env.JWT_SECRET_ADMIN;
router.use(authCtrl.protect(key));

router.post('/add', tagsCtrl.addtag);

router.use(tagsCtrl.istagexist);
router
  .route('/')
  .post(tagsCtrl.gettag)
  .put(tagsCtrl.updatetag)
  .patch(tagsCtrl.deletetag);

module.exports = router;
