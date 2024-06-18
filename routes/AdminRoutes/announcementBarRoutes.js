const router = require('express').Router();
const multer = require('multer');

const announcementCtrl = require('../../controllers/AdminCtrls/announcementBarCtrl');
const authCtrl = require('../../controllers/authController');

router.get('/data', announcementCtrl.getAnnoucements);

const key = process.env.JWT_SECRET_ADMIN;

router.use(authCtrl.protect(key));

router.use(multer().any());

router.post('/add', announcementCtrl.addAnnoucement);
router.post('/getdetails', announcementCtrl.getAnnouncementDetails);
router.post('/update', announcementCtrl.updateAnnoucement);
router.post('/viewstatus', announcementCtrl.changeAnnoucementViewStatus);

// router.use(brandCtrl.isBrandExit);
// router.route('/').post(brandCtrl.getbrand).patch(brandCtrl.deleteBrand);

module.exports = router;
