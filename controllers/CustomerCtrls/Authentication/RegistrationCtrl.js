const bcrypt = require('bcrypt');
const moment = require('moment');
const jwt = require('jsonwebtoken');

const db = require('../../../Database/dbconfig');
const catchAsync = require('../../../Utils/catchAsync');
const AppError = require('../../../Utils/appError');
const createSendToken = require('../../../Utils/jwtToken');
const Joi = require('joi');
const Sms = require('../../../Utils/sms');

exports.checkExistingUser = catchAsync(async (req, res, next) => {
  const { customerMobileNum, customerEmail, mailOrMobile } = req.body;

  const mobileNum = customerMobileNum || mailOrMobile;
  const email = customerEmail || mailOrMobile;

  console.log(mobileNum, email);
  const checkQuery = `SELECT azst_customer_id 
                      FROM  azst_customers_tbl
                      WHERE (azst_customer_mobile = ? OR azst_customer_email = ?) AND azst_customer_status = 1`;

  const result = await db(checkQuery, [mobileNum, email]);
  console.log(result);
  if (result.length > 0)
    return next(new AppError('You have already an account', 400));

  next();
});

const getCustomerName = (customerName) => {
  // Split customer name into first and last name
  let firstName = '';
  let lastName = '';

  if (customerName) {
    const nameParts = customerName.trim().split(' ');
    firstName = nameParts[0];
    lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
  }

  return { firstName, lastName };
};

exports.signup = catchAsync(async (req, res, next) => {
  const {
    customerMobileNum,
    customerEmail,
    customerFirstName,
    customerLastName,
    customerPassword,
    DOB,
    gender,
    wtsupNum,
    notes,
    tags,
  } = req.body;

  // Hash the password
  hashedPassword = '';
  if (customerPassword) {
    hashedPassword = await bcrypt.hash(customerPassword, 10);
  }

  const registerQuery = `INSERT INTO azst_customers_tbl (azst_customer_fname,azst_customer_lname,
                          azst_customer_mobile,azst_customer_email,azst_customer_pwd,azst_customer_DOB,
                          azst_customer_wtsup_num,azst_customer_gender,azst_customer_tags,azst_customer_note)
                        VALUES (?, ?, ?, ?, ?,?, ?, ?, ?, ?) `;

  const values = [
    customerFirstName,
    customerLastName,
    customerMobileNum,
    customerEmail,
    hashedPassword,
    DOB,
    wtsupNum,
    gender,
    tags,
    notes,
  ];

  // Execute the database query
  const results = await db(registerQuery, values);

  // Generate JWT token
  const token = createSendToken(results.insertId, process.env.JWT_SECRET);

  await new Sms(results.insertId, customerMobileNum, '').sendWelcome();

  // Send response
  res.status(201).json({
    jwtToken: token,
    user_details: {
      azst_customer_id: results.insertId,
      azst_customer_name: customerFirstName + ' ' + customerLastName,
      azst_customer_mobile: customerMobileNum,
      azst_customer_email: customerEmail,
    },
    message: 'User registered successfully!',
  });
});

const mobileSignupSchema = Joi.object({
  mailOrMobile: Joi.string().required(),
  customerName: Joi.string().optional().allow(''),
});

exports.validateMobileSingup = catchAsync(async (req, res, next) => {
  const { error } = mobileSignupSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));
  next();
});

exports.mobileSignup = catchAsync(async (req, res, next) => {
  const { mailOrMobile, customerName } = req.body;

  const isMobileNumber = /^[6-9]\d{9}$/.test(mailOrMobile);
  let column = '';
  if (isMobileNumber) {
    column = 'azst_customer_mobile';
  } else {
    column = 'azst_customer_email';
  }
  const { firstName = '', lastName = '' } = getCustomerName(customerName);
  const query = `INSERT INTO azst_customers_tbl (${column},azst_customer_fname,azst_customer_lname,azst_customer_status ) VALUES (?,?,?,?)`;
  const result = await db(query, [mailOrMobile, firstName, lastName, 0]);

  if (result.affectedRows > 0) {
    req.reason = 'Registration';
    const userDetails = { azst_customer_id: result.insertId };
    req.userDetails = userDetails;
    next();
    return;
  }

  return next(AppError('opps something went wrong', 400));
});

exports.updateUserData = catchAsync(async (req, res, next) => {
  const { mailOrMobile, customerName, password } = req.body;

  // Validate inputs
  if (!mailOrMobile || !password) {
    return res
      .status(400)
      .json({ message: 'Email/Mobile and password are required.' });
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Determine if input is mobile number or email
  let mobileNum = null;
  let email = null;

  if (/^[6-9]\d{9}$/.test(mailOrMobile)) {
    mobileNum = mailOrMobile;
  } else if (/^\S+@\S+\.\S+$/.test(mailOrMobile)) {
    email = mailOrMobile.toLowerCase();
  } else {
    return res
      .status(400)
      .json({ message: 'Invalid email or mobile number format.' });
  }

  const { firstName = '', lastName = '' } = getCustomerName(customerName);

  // Construct dynamic update query
  let updateFields = 'azst_customer_pwd = ?';
  const values = [hashedPassword];

  if (firstName) {
    updateFields += ', azst_customer_fname = ?';
    values.push(firstName);
  }

  if (lastName) {
    updateFields += ', azst_customer_lname = ?';
    values.push(lastName);
  }

  values.push(mobileNum, email);

  const updateQuery = `
    UPDATE azst_customers_tbl
    SET ${updateFields}
    WHERE azst_customer_mobile = ? OR azst_customer_email = ?`;

  // Execute the database query
  const updateResults = await db(updateQuery, values);

  // Check if update was successful
  if (updateResults.affectedRows === 0) {
    return next(new AppError("Couldn't update user data", 400));
  }

  // Now, fetch the customer details for the updated row
  const selectQuery = `
    SELECT azst_customer_id, CONCAT(azst_customer_fname, ' ', azst_customer_lname) AS customerName
    FROM azst_customers_tbl
    WHERE azst_customer_mobile = ? OR azst_customer_email = ?  AND azst_customer_status = 1 `;

  const [user] = await db(selectQuery, [mobileNum, email]);

  if (!user) {
    return next(new AppError('User not found after update.', 404));
  }

  // Generate JWT token
  const token = createSendToken(user.azst_customer_id, process.env.JWT_SECRET);

  // Send response
  res.status(200).json({
    jwtToken: token,
    user_details: {
      azst_customer_id: user.azst_customer_id,
      azst_customer_name: user.customerName,
      azst_customer_mobile: mobileNum,
      azst_customer_email: email,
    },
    message: 'User data updated successfully!',
  });
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

  const isExist = `SELECT email FROM azst_newsletter_tbl WHERE email = '${email}'`;
  const [user] = await db(isExist);

  if (user) {
    return next(new AppError('already subscribed', 400));
  }

  const query = `INSERT INTO azst_newsletter_tbl (email, userId) VALUES(?,?)`;
  await db(query, [email, userId]);

  res.status(200).json({ message: 'subscription success' });
});
