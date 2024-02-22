const axios = require('axios');
const db = require('../dbconfig');
const moment = require('moment');

const catchAsync = require('../Utils/catchAsync');
const AppError = require('../Utils/appError');
const createSendToken = require('../Utils/jwtToken');
const enterLoginLogs = require('./CustomerCtrls/Authentication/logsCtrl');

const generateOTP = () => {
  // Generate a random 6-digit number
  const otp = Math.floor(100000 + Math.random() * 900000);
  // Ensure the generated number is exactly 6 digits
  return String(otp).substring(0, 6);
};

const varifyInput = (mailOrMobile) => {
  const isMobileNumber = /^[6-9]\d{9}$/.test(mailOrMobile);
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mailOrMobile);

  return !isMobileNumber && !isEmail;
};

const sendingOTPMobile = async (mailOrMobile, otp) => {
  try {
    const apiKey = process.env.SMS_API_KEY;
    const sender_id = process.env.SMS_SENDER_ID;
    const templated_id = process.env.SMS_TEMPLATE_ID;
    const peid = process.env.SMS_PEID;
    const route = process.env.SMS_ROUTE;

    const smsContent = `Hello, We have Successfully Generated OTP ${otp} on login and registration request. Azista`;
    const url = `http://push.smsc.co.in/api/mt/SendSMS?APIkey=${apiKey}&senderid=${sender_id}&channel=2&DCS=0&flashsms=0&number=91${mailOrMobile}&text=${smsContent}&route=${route}&DLTTemplateId=${templated_id}&PEID=${peid}`;

    const response = await axios.post(url);
    if (response.status === 200) {
      return Promise.resolve();
    } else {
      return Promise.reject(new Error('Failed to send SMS'));
    }
  } catch (error) {
    return Promise.reject(error);
  }
};

exports.sendOtp = catchAsync(async (req, res, next) => {
  const { mailOrMobile } = req.body;
  const otpReason = req.reason;
  const customerId = req.userDetails?.azst_customer_id || 0;

  const notvalidate = varifyInput(mailOrMobile);
  if (notvalidate) {
    return next(new AppError('Invalid Mobile Number or Email', 400));
  }
  const otp = generateOTP();

  try {
    await sendingOTPMobile(mailOrMobile, otp);
  } catch (error) {
    return next(new AppError('Error Occurred OTP Sending', 400));
  }

  const insertOtp = `INSERT INTO azst_otp_verification 
                            (azst_otp_verification_reason, azst_otp_verification_mobile, 
                            azst_otp_verification_value,azst_otp_verification_userid, azst_otp_verification_createdon)
                            VALUES(?,?,?,?,?)`;

  const today = moment().format('YYYY-MM-DD HH:mm:ss');
  const values = [otpReason, mailOrMobile, otp, customerId, today];

  db.query(insertOtp, values, (err, result) => {
    if (err) {
      return next(new AppError(err.sqlMessage || 'Error in sending OTP', 400));
    }
    res
      .status(200)
      .json({ message: 'OTP sent to your registered mobile number' });
  });
});

exports.checkOtpExisting = catchAsync(async (req, res, next) => {
  const { mailOrMobile, otp } = req.body;

  const notvalidate = varifyInput(mailOrMobile);

  if (notvalidate) {
    return next(new AppError('Invalid Mobile Number or Email', 400));
  }

  const getOtpQuery = `SELECT azst_otp_verification_id, azst_otp_verification_value , azst_otp_verification_reason,
                        DATE_FORMAT(azst_otp_verification_createdon, '%Y-%m-%d %H:%i:%s') AS createdTime
                         FROM azst_otp_verification
                         WHERE azst_otp_verification_mobile=? AND azst_otp_verification_status= 1 
                         ORDER BY azst_otp_verification_createdon DESC LIMIT 1`;

  db.query(getOtpQuery, [mailOrMobile], (err, result) => {
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
    const key = process.env.JWT_SECRET;
    const jwtToken = createSendToken(azst_customer_id, key);

    if (reason === 'Login') {
      enterLoginLogs(azst_customer_id, jwtToken);
    }

    res.status(200).json({ jwtToken, message: 'OTP verification successful' });
  });
});
