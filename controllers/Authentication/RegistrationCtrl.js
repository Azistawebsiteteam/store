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
      return next(new AppError(err.sqlMessage, 400));
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

const generateOTP = () => {
  // Generate a random 4-digit number
  const otp = Math.floor(1000 + Math.random() * 9000);
  // Ensure the generated number is exactly 4 digits
  return String(otp).padStart(6, '0');
};

const varifyInput = (otpMedium) => {
  const isMobileNumber = /^[6-9]\d{9}$/.test(otpMedium);
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(otpMedium);

  return !isMobileNumber && !isEmail;
};

exports.mobileSignup = catchAsync(async (req, res, next) => {
  const { otpMedium } = req.body;

  const notvalidate = varifyInput(otpMedium);
  if (notvalidate) {
    return next(new AppError('Invalid Mobile Number or Email', 400));
  }
  const otp = generateOTP();

  const insertOtp = `INSERT INTO azst_otp_verification 
                            (azst_otp_verification_reason, azst_otp_verification_mobile, 
                            azst_otp_verification_value, azst_otp_verification_updatedon)
                            VALUES(?,?,?,?)`;

  const today = moment().format('YYYY-MM-DD HH:mm:ss');
  const values = ['Registration', otpMedium, otp, today];

  db.query(insertOtp, values, (err, result) => {
    if (err) {
      return next(new AppError(err.sqlMessage, 400));
    }

    res.status(200).json({ otp });
  });
});

exports.mobileSignupVerification = catchAsync(async (req, res, next) => {
  const { otpMedium, otp } = req.body;

  const notvalidate = varifyInput(otpMedium);

  if (notvalidate) {
    return next(new AppError('Invalid Mobile Number or Email', 400));
  }

  const getOtpQuery = `SELECT azst_otp_verification_id, azst_otp_verification_value , 
                        DATE_FORMAT(azst_otp_verification_createdon, '%Y-%m-%d %H:%i:%s') AS createdTime
                         FROM azst_otp_verification
                         WHERE azst_otp_verification_mobile=? AND azst_otp_verification_status= 1 
                         ORDER BY azst_otp_verification_createdon DESC LIMIT 1`;

  db.query(getOtpQuery, [otpMedium], (err, result) => {
    if (err) {
      return next(new AppError(err.sqlMessage, 400));
    }
    if (result.length === 0) {
      return next(new AppError('OTP expired or does not exist', 400));
    }
    const {
      azst_otp_verification_id,
      azst_otp_verification_value,
      createdTime,
    } = result[0];
    req.otpDetails = {
      verificationId: azst_otp_verification_id,
      requestOtp: otp,
      databaseOTp: azst_otp_verification_value,
      createdTime,
    };
    next();
  });
});

exports.mobileSignupInsert = catchAsync(async (req, res, next) => {
  const { otpMedium } = req.body;
  const { verificationId } = req.otpDetails;

  const today = moment().format('YYYY-MM-DD HH:mm:ss');

  const registerQuery = `INSERT INTO azst_customer (azst_customer_mobile,azst_customer_email,azst_customer_updatedon)
                          VALUES(?,?,?)`;

  const updateOtpSDetais = `UPDATE azst_otp_verification
                          SET azst_otp_verification_userid = ?, azst_otp_verification_status = ?
                          WHERE azst_otp_verification_id = ?`;

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
    const customerId = result.insertId;
    const otpValues = [customerId, 0, verificationId];
    db.query(updateOtpSDetais, otpValues, (err, result) => {
      if (err) {
        return next(new AppError(err.sqlMessage, 400));
      }
      const jwtToken = createSendToken(customerId);

      res
        .status(200)
        .json({ jwtToken, message: 'OTP verification successful' });
    });
  });
});
