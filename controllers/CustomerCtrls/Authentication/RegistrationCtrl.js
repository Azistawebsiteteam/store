const bcrypt = require('bcrypt');
const moment = require('moment');
const jwt = require('jsonwebtoken');

const db = require('../../../Database/dbconfig');
const catchAsync = require('../../../Utils/catchAsync');
const AppError = require('../../../Utils/appError');
const createSendToken = require('../../../Utils/jwtToken');
const Joi = require('joi');

exports.checkExistingUser = catchAsync(async (req, res, next) => {
  const { customerMobileNum, customerEmail, mailOrMobile } = req.body;

  const mobileNum = customerMobileNum || mailOrMobile;
  const email = customerEmail || mailOrMobile;
  const checkQuery =
    'SELECT azst_customer_id FROM  azst_customers_tbl  WHERE azst_customer_mobile = ? OR azst_customer_email = ? ';

  const result = await db(checkQuery, [mobileNum, email]);

  if (result.length > 0)
    return next(new AppError('You have already an account', 400));

  next();
});

exports.signup = catchAsync(async (req, res, next) => {
  const { mailOrMobile, customerName, password } = req.body;

  // Validate inputs
  if (!mailOrMobile || !customerName || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Determine if input is mobile number or email
  let mobileNum = '';
  let email = '';
  if (/^[6-9]\d{9}$/.test(mailOrMobile)) {
    mobileNum = mailOrMobile;
  } else {
    email = mailOrMobile.toLowerCase();
  }

  // Split customer name into first and last name
  const [firstName = '', lastName = ''] = customerName.split(' ');

  const registerQuery = `
    INSERT INTO azst_customers_tbl (
      azst_customer_fname,
      azst_customer_lname,
      azst_customer_mobile,
      azst_customer_email,
      azst_customer_pwd
    ) VALUES (?, ?, ?, ?, ?)
  `;

  const values = [firstName, lastName, mobileNum, email, hashedPassword];

  // Execute the database query
  const results = await db(registerQuery, values);

  // Generate JWT token
  const token = createSendToken(results.insertId, process.env.JWT_SECRET);

  // Send response
  res.status(201).json({
    jwtToken: token,
    user_details: {
      azst_customer_id: results.insertId,
      azst_customer_name: customerName,
      azst_customer_mobile: mobileNum,
      azst_customer_email: email,
    },
    message: 'User registered successfully!',
  });
});

exports.mobileSignup = catchAsync(async (req, res, next) => {
  req.reason = 'Registration';
  next();
});

exports.mobileSignupInsert = catchAsync(async (req, res, next) => {
  const { mailOrMobile, customerName } = req.body;

  const today = moment().format('YYYY-MM-DD HH:mm:ss');

  const registerQuery = `INSERT INTO azst_customers_tbl (azst_customer_fname,azst_customer_lname,azst_customer_mobile,azst_customer_email,azst_customer_updatedon)
                          VALUES(?,?,?,?,?)`;

  let values = [];
  const isMobileNumber = /^[6-9]\d{9}$/.test(mailOrMobile);
  const firstName = customerName ? customerName.split(' ')[0] : '';
  const lastName = customerName ? customerName.split(' ')[1] : '';
  if (isMobileNumber) {
    values = [firstName, lastName, mailOrMobile, '', today];
  } else {
    values = [firstName, lastName, '', mailOrMobile, today];
  }

  const result = await db(registerQuery, values);
  req.userDetails = { azst_customer_id: result.insertId };
  next();
});

exports.otpSignupDetails = catchAsync(async (req, res, next) => {
  const { firstName, lastName, password, gender } = req.body;
  const today = moment().format('YYYY-MM-DD HH:mm:ss');

  const registerQuery = `UPDATE azst_customers_tbl SET azst_customer_fname = ? ,azst_customer_lname = ?,
                            azst_customer_pwd = ? ,azst_customer_gender =?  ,azst_customer_updatedon = ?
                            WHERE azst_customer_id = ?`;

  const hashedPassword = await bcrypt.hash(password, 10);

  const values = [
    firstName,
    lastName,
    hashedPassword,
    gender,
    today,
    req.empId,
  ];

  const results = await db(registerQuery, values);
  if (results.affectedRows >= 1) {
    res.status(200).json({ message: 'User details updated successfully' });
  }
});

exports.deleteAccount = catchAsync(async (req, res, next) => {
  const deleteQuery = `UPDATE azst_customers_tbl SET azst_customer_status = 0 WHERE azst_customer_id = ?`;
  await db(deleteQuery, [req.empId]);
  res.status(200).json({ message: 'Your account has been deleted' });
});

exports.subscribeNewLetter = catchAsync(async (req, res, next) => {
  const { email, token } = req.body;
  const newLetterSchema = Joi.object({
    email: Joi.string().trim().email().required(),
  });

  const { error } = newLetterSchema.validate({ email });
  if (error) return next(new AppError(error.message, 400));

  let userId = 0;
  if (token && token !== '') {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = payload;
    userId = id;
  }

  const query = `INSERT INTO azst_newsletter_tbl (email, userId) VALUES(?,?)`;
  await db(query, [email, userId]);

  res.status(200).json({ message: 'subscription success' });
});
