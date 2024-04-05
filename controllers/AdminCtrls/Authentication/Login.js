const db = require('../../../dbconfig');
const AppError = require('../../../Utils/appError');

const catchAsync = require('../../../Utils/catchAsync');
const createSendToken = require('../../../Utils/jwtToken');

exports.isAdminExisit = catchAsync(async (req, res, next) => {
  const { userName } = req.body;

  const userId = req.empId ? req.empId : userName;

  const loginQuery = `SELECT azst_admin_details_id,
                        azst_admin_details_admin_id,
                        azst_admin_details_pwd,
                        azst_admin_details_fname,
                        azst_admin_details_mobile,
                        azst_admin_details_email,
                        azst_admin_details_profile_photo
                      FROM azst_admin_details
                      WHERE azst_admin_details_admin_id = ? AND azst_admin_details_status = 1`;

  const result = await db(loginQuery, [userId]);

  if (result.length === 0) {
    return next(
      new AppError('You dont have an account ? Please Register', 404)
    );
  }
  req.adminDetails = result[0];
  next();
});

exports.getAdminDetails = catchAsync(async (req, res) => {
  const adm = req.adminDetails;
  delete adm.azst_admin_details_pwd;
  const adminDetails = {
    ...adm,
    azst_admin_details_profile_photo: `${req.protocol}://${req.get(
      'host'
    )}/admin/profile/${adm.azst_admin_details_profile_photo}`,
  };
  res.status(200).json({ admin_details: adminDetails });
});

exports.login = catchAsync(async (req, res, next) => {
  const { password } = req.body;
  const { azst_admin_details_admin_id, azst_admin_details_pwd } =
    req.adminDetails;

  const isPasswordMatched = password === azst_admin_details_pwd;

  if (!isPasswordMatched) {
    return next(new AppError('Invalid username or password', 404));
  }

  const key = process.env.JWT_SECRET_ADMIN;

  const token = createSendToken(azst_admin_details_admin_id, key);

  const admin = req.adminDetails;
  delete admin.azst_admin_details_pwd;
  const admin_details = {
    ...admin,
    azst_admin_details_profile_photo: `${req.protocol}://${req.get(
      'host'
    )}/admin/profile/${admin.azst_admin_details_profile_photo}`,
  };
  //enterLoginLogs(azst_customer_id, token);
  res.status(200).json({
    jwtToken: token,
    admin_details,
    message: 'Admin loggedin successfully!',
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const getoldPassword =
    'SELECT azst_admin_details_pwd FROM azst_admin_details WHERE azst_admin_details_admin_id= ?';

  const result = await db(getoldPassword, [req.empId]);
  if (result[0].length === 0) {
    return next(
      new AppError('User no longer exists. Please verify the username.', 404)
    );
  }

  const isPasswordMatched =
    currentPassword === result[0]?.azst_admin_details_pwd;

  if (!isPasswordMatched) {
    return next(new AppError('Invalid CurrentPassword', 404));
  }
  const changePasswordAfterReset = `UPDATE azst_admin_details SET azst_admin_details_pwd = ? WHERE azst_admin_details_admin_id = ?`;
  await db(changePasswordAfterReset, [newPassword, req.empId]);
  const key = process.env.JWT_SECRET_ADMIN;
  const token = createSendToken(req.empId, key);
  res.status(200).json({ jwtToken: token });
});
