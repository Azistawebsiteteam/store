const db = require('../../dbconfig');
const bcrypt = require('bcrypt');
const { promisify } = require('util');

const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');
const createSendToken = require('../../Utils/jwtToken');
const organizUserData = require('../../Utils/userDateMadifier');

exports.login = catchAsync(async (req, res, next) => {
  const { mailOrMobile, password } = req.body;
  const loginQuery =
    'SELECT * FROM azst_customer WHERE azst_customer_mobile = ? OR azst_customer_email = ?';

  try {
    const queryAsync = promisify(db.query).bind(db);
    const result = await queryAsync(loginQuery, [mailOrMobile, mailOrMobile]);

    if (result.length === 0) {
      return next(new AppError('Invalid User Credentials', 400));
    }

    const { azst_customer_id, azst_customer_pwd } = result[0];

    const isPasswordMatched = await bcrypt.compare(password, azst_customer_pwd);

    if (!isPasswordMatched) {
      return next(new AppError('Invalid Password', 400));
    }

    const token = createSendToken(azst_customer_id);

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
