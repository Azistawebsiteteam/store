const sharp = require('sharp');
const fs = require('fs');
const Joi = require('joi');

const db = require('../../../Database/dbconfig');
const multerInstance = require('../../../Utils/multer');

const AppError = require('../../../Utils/appError');
const catchAsync = require('../../../Utils/catchAsync');
const createSendToken = require('../../../Utils/jwtToken');

exports.uploadImage = multerInstance.single('profilePic');

exports.checkExistingUser = catchAsync(async (req, res, next) => {
  const { userName, mobileNumber, email } = req.body;

  const checkQuery =
    'SELECT azst_admin_details_admin_id FROM  azst_admin_details  WHERE azst_admin_details_admin_id = ? OR azst_admin_details_mobile = ? OR azst_admin_details_email = ? ';

  const result = await db(checkQuery, [userName, mobileNumber, email]);
  if (result.length > 0)
    return next(new AppError('You have already an account', 400));
  next();
});

exports.storeImage = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Upload brand image is required', 400));
  }
  const imageName = `${Date.now()}-${req.file.originalname.replace(/ /g, '-')}`;
  await sharp(req.file.buffer).toFile(`Uploads/AdminImages/${imageName}`);
  req.body.profilePic = imageName;
  next();
});

exports.updateImage = catchAsync(async (req, res, next) => {
  const { azst_admin_details_profile_photo } = req.adminDetails;
  if (!req.file) {
    req.body.profilePic = azst_admin_details_profile_photo;
    return next();
  }
  const imagePath = `Uploads/AdminImages/${azst_admin_details_profile_photo}`;
  if (imagePath !== `Uploads/AdminImages/blank-profile-picture.png`) {
    fs.unlink(imagePath, (err) => {});
  }

  const imageName = `${Date.now()}-${req.file.originalname.replace(/ /g, '-')}`;
  await sharp(req.file.buffer).toFile(`Uploads/AdminImages/${imageName}`);
  req.body.profilePic = imageName;
  next();
});

const registerSchema = Joi.object({
  title: Joi.string().min(3).allow(''),
  description: Joi.string().min(3).allow(''),
  altText: Joi.string().min(3).allow(''),
  webBanner: Joi.string().min(3).allow(''),
  mobileBanner: Joi.string().min(3).allow(''),
  backgroundUrl: Joi.string().min(3).required(),
  startTime: Joi.string().allow(''),
  endTime: Joi.string().allow(''),
  isDefault: Joi.string().required().valid('0', '1'),
});

exports.createAccount = catchAsync(async (req, res, next) => {
  const { userName, password, fullName, mobileNumber, email, profilePic } =
    req.body;

  const { error } = registerSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));

  const registerQuery = `INSERT INTO azst_admin_details ( azst_admin_details_admin_id, azst_admin_details_pwd,
                        azst_admin_details_fname,azst_admin_details_mobile,azst_admin_details_email,
                        azst_admin_details_profile_photo,azst_admin_details_role)VALUES (?,?,?,?,?,?,?,?)`;
  const values = [
    userName,
    password,
    fullName,
    mobileNumber,
    email,
    profilePic,
    1,
  ];

  await db(registerQuery, values);
  // Add any further logic or response handling here
  const key = process.env.JWT_SECRET_ADMIN;
  const token = createSendToken(userName, key);
  res.status(201).json({
    jwtToken: token,
    user_details: {
      azst_admin_id: userName,
      azst_admin_name: `${fullName}`,
      azst_admin_mobile: mobileNumber,
      azst_admin_email: email,
    },
    message: 'Admin registered successfully!',
  });
});

exports.updateDetails = catchAsync(async (req, res, next) => {
  const { fullName, mobileNumber, email, profilePic } = req.body;

  const updateQuery = `UPDATE azst_admin_details SET  azst_admin_details_fname = ?,azst_admin_details_mobile = ?,
                        azst_admin_details_email = ?,azst_admin_details_profile_photo=?
                        WHERE azst_admin_details_admin_id = ?`;

  const values = [fullName, mobileNumber, email, profilePic, req.empId];
  const result = await db(updateQuery, values);
  if (result.affectedRows === 1) {
    const adminDetails = {
      azst_admin_details_admin_id: req.empId,
      azst_admin_details_email: email,
      azst_admin_details_fname: fullName,
      azst_admin_details_mobile: mobileNumber,
      azst_admin_details_profile_photo: `${req.protocol}://${req.get(
        'host'
      )}/api/images/admin/profile/${profilePic}`,
    };
    return res.status(200).json({
      admin_details: adminDetails,
      message: 'Updated details successfully',
    });
  }
  res.status(400).json({
    admin_details: {},
    message: 'Oops! Something went wrong',
  });
});

exports.removePic = catchAsync(async (req, res, next) => {
  const { azst_admin_details_profile_photo } = req.adminDetails;
  const imagePath = `Uploads/AdminImages/${azst_admin_details_profile_photo}`;
  if (imagePath !== `Uploads/AdminImages/blank-profile-picture.png`) {
    fs.unlink(imagePath, (err) => {});
    const query = `UPDATE azst_admin_details SET  azst_admin_details_profile_photo = 'blank-profile-picture.png' WHERE azst_admin_details_admin_id = ?`;
    await db(query, [req.empId]);
  }

  res.status(200).json({ message: 'Profile picture Removed successfully' });
});
