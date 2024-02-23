//const {promisify} = require('util');
const db = require('../dbconfig');
const bcrypt = require('bcrypt');

const jwt = require('jsonwebtoken');

const catchAsync = require('../Utils/catchAsync');
const AppError = require('../Utils/appError');
const createSendToken = require('../Utils/jwtToken');
const organizUserData = require('../Utils/userDateMadifier');

exports.protect = (token_key) => {
  return catchAsync(async (req, res, next) => {
    // Ensure to return the result of catchAsync
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 1) Getting Token and Check the Token IS valid OR NOT
    if (!token) {
      return next(
        new AppError('You are not logged in! Please log in to get access.', 401)
      );
    }
    // 2) check if user exists
    jwt.verify(token, token_key, (err, payload) => {
      if (err) {
        return next(
          new AppError(
            'The user belonging to this token no longer exists. Login again.',
            401
          )
        );
      }
      req.empId = payload.id;
      next();
    });
  });
};

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const getoldPassword =
    'SELECT azst_customer_pwd FROM azst_customer WHERE azst_customer_id= ?';

  const result = await db(getoldPassword, [req.empId]);

  const isPasswordMatched = await bcrypt.compare(
    currentPassword,
    result[0].azst_customer_pwd
  );

  if (result[0].length === 0 || !isPasswordMatched) {
    return next(new AppError('Invalid CurrentPassword', 404));
  }
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const changePasswordAfterReset = `UPDATE azst_customer SET azst_customer_pwd = ? WHERE azst_customer_id = ?`;
  await db(changePasswordAfterReset, [hashedPassword, req.empId]);
  const key = process.env.JWT_SECRET;
  const token = createSendToken(req.empId, key);
  res.status(200).json({ jwtToken: token });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { newPassword } = req.body;

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const changePasswordAfterReset = `UPDATE azst_customer SET azst_customer_pwd = ? WHERE azst_customer_id = ?`;
  const values = [hashedPassword, req.userDetails.azst_customer_id];
  await db(changePasswordAfterReset, values);
  const key = process.env.JWT_SECRET;
  const token = createSendToken(req.empId, key);
  const user_details = organizUserData(req.userDetails);
  res.status(200).json({
    jwtToken: token,
    user_details,
    message: 'Password Changed successfully!',
  });
});

// exports.restricTo = (...roles) => {
//   return (req, res, next) => {
//     // roles ['admin','lead-guide]. role= 'user
//     if (!roles.includes(req.user.role)) {
//       return next(
//         new AppError('You not have permission to perform this action', 403)
//       );
//     }
//     next();
//   };
// };
