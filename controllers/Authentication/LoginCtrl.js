const db = require('../../dbconfig');
const bcrypt = require('bcrypt');
const { promisify } = require('util');

const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');
const createSendToken = require('../../Utils/jwtToken');
const organizUserData = require('../../Utils/userDateMadifier');

exports.isUserExist = catchAsync(async (req, res, next) => {
  const { mailOrMobile, otpMedium } = req.body;

  const userMailOrMobile = mailOrMobile || otpMedium;

  const loginQuery =
    'SELECT * FROM azst_customer WHERE azst_customer_mobile = ? OR azst_customer_email = ?';
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
