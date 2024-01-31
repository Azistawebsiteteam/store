const db = require('../../dbconfig');
const bcrypt = require('bcrypt');
const moment = require('moment');
const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');
const createSendToken = require('../../Utils/jwtToken');

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
