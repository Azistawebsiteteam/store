const db = require('../../../dbconfig');
const AppError = require('../../../Utils/appError');

const catchAsync = require('../../../Utils/catchAsync');
const createSendToken = require('../../../Utils/jwtToken');

exports.isAdminExist = catchAsync(async (req, res, next) => {
  const { username } = req.body;

  const loginQuery = `SELECT * FROM azst_admin_details 
                      WHERE azst_admin_details_admin_id = ? AND azst_admin_details_status = 1`;

  const [result] = await db.promise().query(loginQuery, [username]);

  if (result.length === 0) {
    return next(new AppError('You dont have an account ? Please Register'));
  }

  req.adminDetails = result[0];

  next();
});

exports.login = catchAsync(async (req, res, next) => {
  const { password } = req.body;

  const { azst_admin_details_admin_id, azst_admin_details_pwd } =
    req.adminDetails;

  const isPasswordMatched = password === azst_admin_details_pwd;

  if (!isPasswordMatched) {
    return next(new AppError('Invalid username or password', 400));
  }

  const token = createSendToken(azst_admin_details_admin_id);
  const admin = req.adminDetails;
  const admin_details = {
    admin_id: admin.azst_admin_details_admin_id,
    admin_first_name: admin.azst_admin_details_fname,
    admin_last_name: admin.azst_admin_details_lname,
    admin_mobile_num: admin.azst_admin_details_mobile,
    admin_email: admin.azst_admin_details_email,
  };
  //enterLoginLogs(azst_customer_id, token);
  res.status(200).json({
    jwtToken: token,
    admin_details,
    message: 'Admin loggedin successfully!',
  });
});
