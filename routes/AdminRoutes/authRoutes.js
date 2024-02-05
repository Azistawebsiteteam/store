const express = require('express');

const loginCtrl = require('../../controllers/AdminCtrls/Authentication/Login');

const router = express.Router();

router.post('/login', loginCtrl.isAdminExisit, loginCtrl.login);

module.exports = router;
