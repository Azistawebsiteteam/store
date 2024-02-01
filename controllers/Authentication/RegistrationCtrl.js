const db = require('../../dbconfig');
const bcrypt = require('bcrypt');
const moment = require('moment');
const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');
const createSendToken = require('../../Utils/jwtToken');

exports.checkExistingUser = catchAsync(async (req, res, next) => {
  const { customerMobileNum, customerEmail, otpMedium } = req.body;
  const mobileNum = customerMobileNum || otpMedium;
  const email = customerEmail || otpMedium;
  const checkQuery =
    'SELECT azst_customer_id FROM  azst_customer  WHERE azst_customer_mobile = ? OR azst_customer_email = ? ';

  db.query(checkQuery, [mobileNum, email], (err, result) => {
    if (err) {
      return next(new AppError(err.sqlMessage || 'Internal server error', 400));
    }
    if (result.length > 0) {
      return next(new AppError('You have already an account', 400));
    }
    next();
  });
});

exports.signup = catchAsync(async (req, res, next) => {
  const {
    customerFirstName,
    customerLastName,
    customerMobileNum,
    customerEmail,
    customerPassword,
  } = req.body;

  const today = moment().format('YYYY-MM-DD HH:mm:ss');

  const registerQuery = `INSERT INTO azst_customer (azst_customer_fname,azst_customer_lname,azst_customer_mobile,azst_customer_email,
                          azst_customer_pwd,azst_customer_updatedon)
                          VALUES(?,?,?,?,?,?)`;

  const hashedPassword = await bcrypt.hash(customerPassword, 10);

  const values = [
    customerFirstName,
    customerLastName,
    customerMobileNum,
    customerEmail.toLowerCase(),
    hashedPassword,
    today,
  ];

  db.query(registerQuery, values, (err, results) => {
    if (err) {
      return next(new AppError(err.sqlMessage, 400));
    }
    // Add any further logic or response handling here
    const token = createSendToken(results.insertId);
    res.status(201).json({
      jwtToken: token,
      user_details: {
        azst_customer_id: results.insertId,
        azst_customer_name: `${customerFirstName} ${customerLastName}`,
        azst_customer_mobile: customerMobileNum,
        azst_customer_email: customerEmail,
      },
      message: 'User registered successfully!',
    });
  });
});

exports.mobileSignup = catchAsync(async (req, res, next) => {
  req.reason = 'Registration';
  next();
});

exports.mobileSignupInsert = catchAsync(async (req, res, next) => {
  const { otpMedium } = req.body;

  const today = moment().format('YYYY-MM-DD HH:mm:ss');

  const registerQuery = `INSERT INTO azst_customer (azst_customer_mobile,azst_customer_email,azst_customer_updatedon)
                          VALUES(?,?,?)`;

  let values = [];
  const isMobileNumber = /^[6-9]\d{9}$/.test(otpMedium);
  if (isMobileNumber) {
    values = [otpMedium, '', today];
  } else {
    values = ['', otpMedium, today];
  }

  db.query(registerQuery, values, (err, result) => {
    if (err) {
      return next(new AppError(err.sqlMessage, 400));
    }
    req.userDetails = { azst_customer_id: result.insertId };
    next();
  });
});
