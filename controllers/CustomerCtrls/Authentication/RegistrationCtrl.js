const bcrypt = require('bcrypt');
const moment = require('moment');

const db = require('../../../dbconfig');
const catchAsync = require('../../../Utils/catchAsync');
const AppError = require('../../../Utils/appError');
const createSendToken = require('../../../Utils/jwtToken');

exports.checkExistingUser = catchAsync(async (req, res, next) => {
  const { customerMobileNum, customerEmail, mailOrMobile } = req.body;
  const mobileNum = customerMobileNum || mailOrMobile;
  const email = customerEmail || mailOrMobile;
  const checkQuery =
    'SELECT azst_customer_id FROM  azst_customer  WHERE azst_customer_mobile = ? OR azst_customer_email = ? ';

  const result = await db(checkQuery, [mobileNum, email]);
  if (result.length > 0)
    return next(new AppError('You have already an account', 400));
  next();
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

  const results = await db(registerQuery, values);
  // Add any further logic or response handling here
  const key = process.env.JWT_SECRET;
  const token = createSendToken(results.insertId, key);
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

exports.mobileSignup = catchAsync(async (req, res, next) => {
  req.reason = 'Registration';
  next();
});

exports.mobileSignupInsert = catchAsync(async (req, res, next) => {
  const { mailOrMobile } = req.body;

  const today = moment().format('YYYY-MM-DD HH:mm:ss');

  const registerQuery = `INSERT INTO azst_customer (azst_customer_mobile,azst_customer_email,azst_customer_updatedon)
                          VALUES(?,?,?)`;

  let values = [];
  const isMobileNumber = /^[6-9]\d{9}$/.test(mailOrMobile);
  if (isMobileNumber) {
    values = [mailOrMobile, '', today];
  } else {
    values = ['', mailOrMobile, today];
  }

  const result = await db(registerQuery, values);
  req.userDetails = { azst_customer_id: result.insertId };
  next();
});

exports.deleteAccount = catchAsync(async (req, res, next) => {
  const deleteQuery = `UPDATE azst_customer SET azst_customer_status = 0 WHERE azst_customer_id = ?`;
  await db(deleteQuery, [req.empId]);
  res.status(200).json({ message: 'Your account has been deleted' });
});

exports.updateDetails = catchAsync(async (req, res, next) => {});
