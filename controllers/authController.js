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

    // 1) Getting Token and Check is there or not available
    if (!token) {
      return next(
        new AppError('You are not logged in! Please log in to get access.', 401)
      );
    }

    // 2) check it is valid token or not
    const payload = await jwt.verify(token, token_key);
    const { id } = payload;

    // 3) check user active or not  or dleted account
    let query = '';
    if (token_key === process.env.JWT_SECRET) {
      query = `SELECT * FROM azst_customer 
                      WHERE azst_customer_id = ? AND azst_customer_status = 1`;
    } else {
      query = `SELECT * FROM azst_admin_details 
                      WHERE azst_admin_details_admin_id = ? AND azst_admin_details_status = 1`;
    }
    const result = await db(query, [id]);
    if (result.length <= 0)
      return next(
        new AppError(
          'The user belonging to this token no longer exists. Login again.',
          401
        )
      );
    const user = result[0];

    const userDetails = {
      user_id: user.azst_customer_id || user.azst_admin_details_admin_id,
      user_frist_name:
        user.azst_customer_fname || user.azst_admin_details_fname,
      user_last_name: user.azst_customer_lname || user.azst_admin_details_lname,
      user_mobile: user.azst_customer_mobile || user.azst_admin_details_mobile,
      user_email: user.azst_customer_email || user.azst_admin_details_email,
      user_hno: user.azst_customer_hno || null,
      user_area: user.azst_customer_area || null,
      user_city: user.azst_customer_city || null,
      user_district: user.azst_customer_district || null,
      user_state: user.azst_customer_state || null,
      user_country: user.azst_customer_country || null,
      user_zip: user.azst_customer_zip || null,
      user_role: user.azst_admin_details_type || null,
    };

    req.userDetails = userDetails;

    req.empId = payload.id;

    next();
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
