const db = require('../../../dbconfig');
const bcrypt = require('bcrypt');
const { promisify } = require('util');
const moment = require('moment');

const catchAsync = require('../../../Utils/catchAsync');
const AppError = require('../../../Utils/appError');
const createSendToken = require('../../../Utils/jwtToken');
const organizUserData = require('../../../Utils/userDateMadifier');
const enterLoginLogs = require('./logsCtrl');

exports.isUserExisit = catchAsync(async (req, res, next) => {
  const { mailOrMobile } = req.body;

  const userMailOrMobile = mailOrMobile;

  const loginQuery = `SELECT * FROM azst_customer 
                      WHERE azst_customer_mobile = ? OR azst_customer_email = ?
                      AND azst_customer_status = 1`;
  const [result] = await db
    .promise()
    .query(loginQuery, [userMailOrMobile, userMailOrMobile]);
  if (result.length === 0) {
    return next(new AppError('You dont have an account ? Please Register'));
  }
  req.userDetails = result[0];

  next();
});

exports.login = catchAsync(async (req, res, next) => {
  const { password } = req.body;

  const { azst_customer_id, azst_customer_pwd } = req.userDetails;

  const isPasswordMatched = await bcrypt.compare(password, azst_customer_pwd);

  if (!isPasswordMatched) {
    return next(new AppError('Invalid username or password', 400));
  }

  const token = createSendToken(azst_customer_id);

  const user_details = organizUserData(req.userDetails);
  enterLoginLogs(azst_customer_id, token);
  res.status(200).json({
    jwtToken: token,
    user_details,
    message: 'User logged in successfully!',
  });
});

exports.otpLogin = catchAsync(async (req, res, next) => {
  req.reason = 'Login';
  next();
});

exports.logout = catchAsync(async (req, res, next) => {
  const token = req.headers.authorization.split(' ')[1];

  const logoutQuery = `UPDATE azst_customer_login_logs SET azst_customer_login_logs_logouttime=?,
                       azst_customer_login_logs_status=? WHERE azst_customer_login_logs_sessionid=?`;

  const today = moment().format('YYYY-MM-DD HH:mm:ss');
  const values = [today, 'end', token];
  db.query(logoutQuery, values, (err, results) => {
    if (err) {
      return next(new AppError(err.sqlMessage, 400));
    }

    res.status(200).json({ message: 'Logged out successfully' });
  });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  req.reason = 'forgot password';
  next();
});
