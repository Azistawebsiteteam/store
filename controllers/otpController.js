const db = require('../dbconfig');
const moment = require('moment');

const catchAsync = require('../Utils/catchAsync');
const AppError = require('../Utils/appError');
const createSendToken = require('../Utils/jwtToken');
const enterLoginLogs = require('./Authentication/logsCtrl');

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

exports.sendOtp = catchAsync(async (req, res, next) => {
  const { otpMedium } = req.body;
  const otpReason = req.reason;
  const customerId = req.userDetails?.azst_customer_id || 0;

  const notvalidate = varifyInput(otpMedium);
  if (notvalidate) {
    return next(new AppError('Invalid Mobile Number or Email', 400));
  }
  const otp = generateOTP();

  const insertOtp = `INSERT INTO azst_otp_verification 
                            (azst_otp_verification_reason, azst_otp_verification_mobile, 
                            azst_otp_verification_value,azst_otp_verification_userid, azst_otp_verification_createdon)
                            VALUES(?,?,?,?,?)`;

  const today = moment().format('YYYY-MM-DD HH:mm:ss');
  const values = [otpReason, otpMedium, otp, customerId, today];

  db.query(insertOtp, values, (err, result) => {
    if (err) {
      return next(new AppError(err.sqlMessage || 'error in sending otp', 400));
    }
    res.status(200).json({ otp });
  });
});

exports.checkOtpExisting = catchAsync(async (req, res, next) => {
  const { otpMedium, otp } = req.body;

  const notvalidate = varifyInput(otpMedium);

  if (notvalidate) {
    return next(new AppError('Invalid Mobile Number or Email', 400));
  }

  const getOtpQuery = `SELECT azst_otp_verification_id, azst_otp_verification_value , azst_otp_verification_reason,
                        DATE_FORMAT(azst_otp_verification_createdon, '%Y-%m-%d %H:%i:%s') AS createdTime
                         FROM azst_otp_verification
                         WHERE azst_otp_verification_mobile=? AND azst_otp_verification_status= 1 
                         ORDER BY azst_otp_verification_createdon DESC LIMIT 1`;

  db.query(getOtpQuery, [otpMedium], (err, result) => {
    if (err) {
      return next(new AppError(err.sqlMessage || 'Error otp verifying', 400));
    }
    if (result.length === 0) {
      return next(new AppError('OTP expired or does not exist', 400));
    }
    const {
      azst_otp_verification_id,
      azst_otp_verification_value,
      createdTime,
      azst_otp_verification_reason,
    } = result[0];
    req.otpDetails = {
      verificationId: azst_otp_verification_id,
      requestOtp: otp,
      databaseOTp: azst_otp_verification_value,
      reason: azst_otp_verification_reason,
      createdTime,
    };
    next();
  });
});

exports.verifyOTP = catchAsync(async (req, res, next) => {
  const { requestOtp, databaseOTp, createdTime } = req.otpDetails;

  // Check if OTP exists and is not expired
  const expireTime = moment(createdTime, 'YYYY-MM-DD HH:mm:ss')
    .add(5, 'minutes')
    .format('YYYY-MM-DD HH:mm:ss');

  if (!databaseOTp || expireTime < Date.now()) {
    return res.status(400).json({ message: 'OTP expired or does not exist' });
  }
  // Verify the provided OTP
  if (databaseOTp === requestOtp) {
    next();
  } else {
    res.status(400).json({ message: 'Invalid OTP' });
  }
});

exports.updateOtpDetails = catchAsync(async (req, res, next) => {
  const { verificationId, reason } = req.otpDetails;

  const { azst_customer_id } = req.userDetails;

  const updateOtpSDetais = `UPDATE azst_otp_verification
                            SET azst_otp_verification_userid = ?, azst_otp_verification_status = ?
                            WHERE azst_otp_verification_id = ?`;

  const otpValues = [azst_customer_id, 0, verificationId];

  db.query(updateOtpSDetais, otpValues, (err, result) => {
    if (err) {
      return next(new AppError(err.sqlMessage, 400));
    }
    const jwtToken = createSendToken(azst_customer_id);

    if (reason === 'Login') {
      enterLoginLogs(azst_customer_id, jwtToken);
    }

    res.status(200).json({ jwtToken, message: 'OTP verification successful' });
  });
});
