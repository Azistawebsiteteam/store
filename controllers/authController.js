//const {promisify} = require('util');
const db = require('../dbconfig');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const moment = require('moment');
const bcrypt = require('bcrypt');
const { promisify } = require('util');

const catchAsync = require('../Utils/catchAsync');
const AppError = require('../Utils/appError');
//const Email = require('./../Utils/email');

const createSendToken = (id) => {
  const token = jwt.sign({ id }, process.env.JWT_SECRET);
  return token;
};

const organizUserData = (user) => {
  return {
    azst_user_id: user.azst_customer_id,
    azst_customer_name: user.azst_customer_name,
    azst_customer_mobile: user.azst_customer_mobile,
    azst_customer_email: user.azst_customer_email,
    azst_customer_hno: user.azst_customer_hno,
    azst_customer_area: user.azst_customer_area,
    azst_customer_city: user.azst_customer_city,
    azst_customer_district: user.azst_customer_district,
    azst_customer_state: user.azst_customer_state,
    azst_customer_country: user.azst_customer_country,
  };
};

exports.signup = catchAsync(async (req, res, next) => {
  const {
    customerName,
    customerMobileNum,
    customerEmail,
    customerPassword,
    customerHouseNo,
    customerArea,
    customerCity,
    customerDistrict,
    customerState,
    customerCountry,
    customerLandmark,
  } = req.body;

  const today = moment().format('YYYY-MM-DD HH:mm:ss');

  const registerQuery = `INSERT INTO azst_customer (azst_customer_name,azst_customer_mobile,azst_customer_email,
                          azst_customer_pwd,azst_customer_hno,azst_customer_area,azst_customer_city,azst_customer_district,azst_customer_state,
                          azst_customer_country,azst_customer_landmark,azst_customer_updatedon)
                          VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`;

  const hashedPassword = await bcrypt.hash(customerPassword, 10);

  const values = [
    customerName,
    customerMobileNum,
    customerEmail.toLowerCase(),
    hashedPassword,
    customerHouseNo,
    customerArea,
    customerCity,
    customerDistrict,
    customerState,
    customerCountry,
    customerLandmark,
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
        azst_user_id: results.insertId,
        azst_customer_name: customerName,
        azst_customer_mobile: customerMobileNum,
        azst_customer_email: customerEmail,
        azst_customer_area: customerArea,
        azst_customer_city: customerCity,
        azst_customer_district: customerDistrict,
        azst_customer_state: customerState,
        azst_customer_country: customerCountry,
      },
      message: 'User registered successfully!',
    });
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { mailOrMobile, password } = req.body;
  const loginQuery =
    'SELECT * FROM azst_customer WHERE azst_customer_mobile = ? OR azst_customer_email = ?';

  try {
    const queryAsync = promisify(db.query).bind(db);
    const result = await queryAsync(loginQuery, [mailOrMobile, mailOrMobile]);

    if (result.length === 0) {
      return next(new AppError('Invalid User Credentials', 404));
    }

    const { azst_user_id, azst_customer_pwd } = result[0];
    const isPasswordMatched = await bcrypt.compare(password, azst_customer_pwd);

    if (!isPasswordMatched) {
      return next(new AppError('Invalid Password', 404));
    }

    const token = createSendToken(azst_user_id);

    const user_details = organizUserData(result[0]);

    res.status(200).json({
      jwtToken: token,
      user_details,
      message: 'User logged in successfully!',
    });
  } catch (err) {
    return next(new AppError(err.sqlMessage || 'Internal Server Error', 500));
  }
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
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
      new AppError('you are not logged in! Please login to get access.', 401)
    );
  }

  // 2) check if user is exist
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError(
        'The User could beloonging to this token does no longer exist.',
        401
      )
    );
  }
  // 3) if user changed password after the token was issued,
  if (currentUser.changePasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! please Login again', 404)
    );
  }

  // all the condition are satisfied so access the data using the token

  req.user = currentUser;
  next();
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

// exports.forgotPassword = catchAsync(async (req, res, next) => {
//   //1) get user based on email address

//   const user = await User.findOne({ email: req.body.email });

//   if (!user) {
//     return next(new AppError('There is no user with that email address', 404));
//   }

//   // 2) generate the random reset token

//   const resetToken = user.createPasswordRestToken();

//   await user.save({ validateBeforeSave: false });

//   // 3) send it to the uset email address

//   try {
//     const resetUrl = `${req.get('origin')}/forgotpass/${resetToken}`;

//     await new Email(user, resetUrl).sendPasswordReset();
//     res.status(200).json({
//       status: 'success',
//       message: 'Token sent to your email address',
//     });
//   } catch (err) {
//     user.passwordResetToken = undefined;
//     user.passwordResetExpires = undefined;
//     await user.save({ validateBeforeSave: false });
//     return next(
//       new AppError(
//         'There was an error sending the email. Try again later!',
//         500
//       )
//     );
//   }
// });

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1)get user based on token reset token

  const hasedtoken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hasedtoken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) if token is Invalid and there is nouser, send error
  if (!user) {
    return next(new AppError('Token is Invalid or has Expired', 400));
  }

  // 3)if user find then update changepasswordAt poperty for the user
  (user.password = req.body.password),
    (user.passwordConfirm = req.body.passwordConfirm),
    (user.passwordChangedAt = Date.now());
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 4) log the user and send jwt token

  createSendToken(user, 200, req, res);
});

// exports.updatepassword = catchAsync(async (req, res, next) => {
//   // 1) get user form collection
//   //console.log(req.user.id,req.body.passwordCurrent,req.body.password,req.body.passwordConfirm)
//   const user = await User.findById(req.user.id).select('+password');
//   //2) check if posted paasword correct
//   const correctPassword = await user.correctPassword(
//     req.body.passwordCurrent,
//     user.password
//   );

//   if (!user || !correctPassword) {
//     return next(
//       new AppError(
//         'Your Current password is wrong ,Enter Correct Password',
//         401
//       )
//     );
//   }
//   // 3) corect update password
//   user.password = req.body.password;
//   user.passwordConfirm = req.body.passwordConfirm;
//   await user.save();

//   // 4)// Login user and send token to user
//   createSendToken(user, 200, req, res);
// });

// exports.isLoggedIn = catchAsync(async (req, res, next) => {
//   if (req.cookies.jwt) {
//     const decoded = jwt.verify(req.cookies.jwt, process.env.JWT_SECRET);
//     const currentUser = await User.findById(decoded.id);
//     if (!currentUser) {
//       return next();
//     }
//     if (currentUser.changePasswordAfter(decoded.iat)) {
//       return next();
//     }

//     res.locals.user = currentUser;
//     return next();
//   }

//   next();
// });
