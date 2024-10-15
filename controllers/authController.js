const db = require('../Database/dbconfig');
const bcrypt = require('bcrypt');

const jwt = require('jsonwebtoken');

const catchAsync = require('../Utils/catchAsync');
const AppError = require('../Utils/appError');

const createSendToken = require('../Utils/jwtToken');
const organizUserData = require('../Utils/userDateMadifier');

exports.protect = (token_key) => {
  return catchAsync(async (req, res, next) => {
    if (!token_key) {
      return next(new AppError('Please provide a token key', 500));
    }

    // Extract token from headers
    const token = extractToken(req.headers.authorization);
    if (!token) {
      return next(
        new AppError('You are not logged in! Please log in to get access.', 401)
      );
    }

    // Verify token and extract payload
    let payload;
    try {
      payload = jwt.verify(token, token_key);
    } catch (err) {
      return next(new AppError('Invalid token. Please log in again.', 401));
    }

    const { id } = payload;

    // Determine the appropriate query based on token_key
    const query = getUserQuery(token_key);
    const result = await db(query, [id]);

    if (result.length === 0) {
      return next(
        new AppError(
          'The user belonging to this token no longer exists. Login again.',
          401
        )
      );
    }

    const user = result[0];

    // Map user details based on token_key
    req.userDetails = mapUserDetails(user, token_key);
    req.empId = id;

    next();
  });
};

// Utility function to extract token from authorization header
const extractToken = (authorization) => {
  if (authorization && authorization.startsWith('Bearer')) {
    return authorization.split(' ')[1];
  }
  return null;
};

// Utility function to get the appropriate user query based on the token_key
const getUserQuery = (token_key) => {
  if (token_key === process.env.JWT_SECRET) {
    return `SELECT * FROM azst_customers_tbl 
            WHERE azst_customer_id = ? AND azst_customer_status = 1`;
  }
  return `SELECT * FROM azst_admin_details 
          WHERE azst_admin_details_admin_id = ? AND azst_admin_details_status = 1`;
};

// Utility function to map user details based on token_key
const mapUserDetails = (user, token_key) => {
  if (token_key === process.env.JWT_SECRET) {
    return {
      user_id: user.azst_customer_id,
      user_name: `${user.azst_customer_fname} ${user.azst_customer_lname}`,
      user_mobile: user.azst_customer_mobile,
      user_email: user.azst_customer_email,
      user_hno: user.azst_customer_hno,
      user_area: user.azst_customer_area,
      user_city: user.azst_customer_city,
      user_district: user.azst_customer_district,
      user_state: user.azst_customer_state,
      user_country: user.azst_customer_country,
      user_zip: user.azst_customer_zip,
      user_role: user.azst_admin_details_type,
    };
  }
  return {
    user_id: user.azst_admin_details_admin_id,
    user_name: `${user.azst_admin_details_fname} ${user.azst_admin_details_lname}`,
    user_mobile: user.azst_admin_details_mobile,
    user_email: user.azst_admin_details_email,
    user_hno: null,
    user_area: null,
    user_city: null,
    user_district: null,
    user_state: null,
    user_country: null,
    user_zip: null,
    user_role: null,
  };
};

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const getoldPassword =
    'SELECT azst_customer_pwd FROM azst_customers_tbl WHERE azst_customer_id= ?';

  const result = await db(getoldPassword, [req.empId]);

  if (result[0].length === 0) {
    return next(
      new AppError('User no longer exists. Please verify the username.', 404)
    );
  }
  const isPasswordMatched = await bcrypt.compare(
    currentPassword,
    result[0].azst_customer_pwd
  );

  if (!isPasswordMatched) {
    return next(new AppError('Invalid CurrentPassword', 404));
  }
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const changePasswordAfterReset = `UPDATE azst_customers_tbl SET azst_customer_pwd = ? WHERE azst_customer_id = ?`;
  await db(changePasswordAfterReset, [hashedPassword, req.empId]);
  const key = process.env.JWT_SECRET;
  const token = createSendToken(req.empId, key);
  res.status(200).json({ jwtToken: token });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { newPassword } = req.body;
  const { azst_customer_id } = req.userDetails;
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const changePasswordAfterReset = `UPDATE azst_customers_tbl SET azst_customer_pwd = ? WHERE azst_customer_id = ?`;

  const values = [hashedPassword, azst_customer_id];
  await db(changePasswordAfterReset, values);
  const key = process.env.JWT_SECRET;
  const token = createSendToken(azst_customer_id, key);
  const user_details = organizUserData(req.userDetails);
  res.status(200).json({
    jwtToken: token,
    user_details,
    message: 'Password Changed successfully!',
  });
});

// exports.restricTo = (...roles) => {
//   return (req, res, next) => {
//     // roles ['admin','lead-guide'] role= 'user'
//     if (!roles.includes(req.user.role)) {
//       return next(
//         new AppError('You not have permission to perform this action', 403)
//       );
//     }
//     next();
//   };
// };
