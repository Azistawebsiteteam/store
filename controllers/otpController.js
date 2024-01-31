const db = require('../dbconfig');
const moment = require('moment');

const catchAsync = require('../Utils/catchAsync');

// exports.sendOtp = catchasync(async (req, res, next) => {
//   db.query(getEmployee, (err, result) => {
//     if (err) {
//       return next(new AppError(err.sqlMessage, 400));
//     }
//     if (result.length > 0) {
//       const { emp_id, mobile_num } = result[0];
//       const Otp = generateOTP();
//       console.log(Otp);
//       // Store the OTP and its expiration time (e.g., 5 minutes)
//       const otpData = { Otp, expiresAt: Date.now() + 5 * 60 * 1000 };

//       otpStorage[emp_id] = otpData;

//       res.status(200).json({ id: emp_id, Otp });
//     } else {
//       res.status(404).send({ message: 'Invalid Employee Id' });
//     }
//   });
// });

exports.verifyOTP = catchAsync(async (req, res, next) => {
  const { verificationId, requestOtp, databaseOTp, createdTime } =
    req.otpDetails;

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
