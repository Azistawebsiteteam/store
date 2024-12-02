const db = require('../Database/dbconfig');
const moment = require('moment');

const catchAsync = require('../Utils/catchAsync');
const AppError = require('../Utils/appError');
const createSendToken = require('../Utils/jwtToken');
const enterLoginLogs = require('./CustomerCtrls/Authentication/logsCtrl');
const SMS = require('../Utils/sms');
const Email = require('../Utils/email');

const generateOTP = () => {
  // Generate a random 6-digit number
  const otp = Math.floor(100000 + Math.random() * 900000);
  return String(otp).substring(0, 6);
};

const varifyInput = (mailOrMobile) => {
  const isMobileNumber = /^[6-9]\d{9}$/.test(mailOrMobile);
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mailOrMobile);

  return !isMobileNumber && !isEmail;
};

const sendingOTPMobile = async (mobileNum, otp, reason) => {
  const sms = new SMS('', mobileNum);
  if (reason === 'Login') {
    await sms.loginOTP(otp);
  } else {
    await sms.registrationRquest(otp);
  }
};

const sendingOTPEmail = async (mail, otp, reason) => {
  const email = new Email('', mail, '');
  if (reason === 'Login') {
    await email.sendLoginOtp(otp);
  } else {
    console.log('register');
    await email.sendRegistrationOtp(otp);
  }
};

exports.sendOtp = catchAsync(async (req, res, next) => {
  const { mailOrMobile } = req.body;
  const otpReason = req.reason;
  const customerId = req.userDetails.azst_customer_id ?? 0;

  const notvalidate = varifyInput(mailOrMobile);
  if (notvalidate) {
    return next(new AppError('Invalid Mobile Number or Email', 400));
  }
  const otp = generateOTP();

  try {
    const isMobileNumber = /^[6-9]\d{9}$/.test(mailOrMobile);
    if (isMobileNumber) {
      await sendingOTPMobile(mailOrMobile, otp, otpReason);
    } else {
      sendingOTPEmail(mailOrMobile, otp);
    }
  } catch (error) {
    console.log(error.message);
    return next(
      new AppError('Unable to send OTP. Please use your credentials.', 400)
    );
  }

  const insertOtp = `INSERT INTO azst_otp_verification 
                            (azst_otp_verification_reason, azst_otp_verification_mobile, 
                            azst_otp_verification_value,azst_otp_verification_userid, azst_otp_verification_createdon)
                            VALUES(?,?,?,?,?)`;

  const today = moment().format('YYYY-MM-DD HH:mm:ss');
  const values = [otpReason, mailOrMobile, otp, customerId, today];

  await db(insertOtp, values);
  res
    .status(200)
    .json({ message: 'OTP sent to your registered mobile number' });
});

exports.checkOtpExisting = catchAsync(async (req, res, next) => {
  const { mailOrMobile, otp } = req.body;
  const { azst_customer_id = 0 } = req.userDetails ?? {};

  const notvalidate = varifyInput(mailOrMobile);

  if (notvalidate) {
    return next(new AppError('Invalid Mobile Number or Email', 400));
  }

  const getOtpQuery = `SELECT azst_otp_verification_id, azst_otp_verification_value , azst_otp_verification_reason,
                         azst_otp_verification_userid, DATE_FORMAT(azst_otp_verification_createdon, '%Y-%m-%d %H:%i:%s') AS createdTime
                        FROM azst_otp_verification
                        WHERE azst_otp_verification_mobile=? AND azst_otp_verification_status= 1 
                        ORDER BY azst_otp_verification_createdon DESC LIMIT 1`;

  const result = await db(getOtpQuery, [mailOrMobile]);
  // verify OTP existing or not
  if (result.length === 0) {
    return next(new AppError('OTP expired or does not exist', 400));
  }

  const {
    azst_otp_verification_id,
    azst_otp_verification_value,
    azst_otp_verification_userid,
    createdTime,
    azst_otp_verification_reason,
  } = result[0];

  const isExpired = moment(createdTime, 'YYYY-MM-DD HH:mm:ss')
    .add(5, 'minutes')
    .isBefore(moment());
  // verify OTP is Expires

  const userId =
    azst_customer_id === 0 ? azst_otp_verification_userid : azst_customer_id;
  if (isExpired) {
    const updateOtpSDetais = `UPDATE azst_otp_verification
                              SET azst_otp_verification_userid = ?, azst_otp_verification_status = ?
                              WHERE azst_otp_verification_id = ?`;

    const otpValues = [userId, 0, azst_otp_verification_id];
    await db(updateOtpSDetais, otpValues);
    return next(new AppError('OTP expired or does not exist', 400));
  }
  // Verify the provided OTP
  if (azst_otp_verification_value !== otp) {
    return next(new AppError('Invalid OTP', 400));
  }
  // here assing the opt relataed data to req in body for next operation
  req.otpDetails = {
    verificationId: azst_otp_verification_id,
    reason: azst_otp_verification_reason,
  };

  req.userDetails = { azst_customer_id: userId };
  next();
});

exports.updateOtpDetails = catchAsync(async (req, res, next) => {
  const { verificationId, reason } = req.otpDetails;
  const { mailOrMobile } = req.body;
  let { azst_customer_id } = req.userDetails;

  // if the reason is forgot password go to authcontroll and update the password with the new password
  if (reason === 'forgot password') {
    return next();
  }

  const updateOtpSDetais = `UPDATE azst_otp_verification
                            SET azst_otp_verification_userid = ?, azst_otp_verification_status = ?
                            WHERE azst_otp_verification_id = ?`;

  const otpValues = [azst_customer_id, 0, verificationId];

  await db(updateOtpSDetais, otpValues);
  const key = process.env.JWT_SECRET;

  if (reason === 'Registration') {
    const query = `UPDATE azst_customers_tbl SET azst_customer_status = 1 
                    WHERE azst_customer_id =  ? `;
    await db(query, [azst_customer_id]);
    new Sms(azst_customer_id, '').sendWelcome(mailOrMobile);
  }

  const jwtToken = createSendToken(azst_customer_id, key);

  // if the reason is Login OR Registration create a login log here
  if (reason === 'Login' || reason === 'Registration') {
    enterLoginLogs(azst_customer_id, jwtToken);
  }

  res.status(200).json({ jwtToken, message: 'OTP verification successful' });
});
