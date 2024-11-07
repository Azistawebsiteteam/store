const sharp = require('sharp');
const fs = require('fs');

const db = require('../../Database/dbconfig');
const multerInstance = require('../../Utils/multer');
const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');
const Joi = require('joi');

const popupSchema = Joi.object({
  Name: Joi.string().min(3).max(50).required(),
  Url: Joi.string().min(2).required(),
  popupImage: Joi.string().required().allow(''),
  btnColor: Joi.string().required().allow(''),
});

exports.isPopupExist = catchAsync(async (req, res, next) => {
  const { popupId } = req.body;
  if (!popupId) return next(new AppError('PopupId Id is Required', 400));

  const getPopup = `SELECT * FROM azst_popups_table WHERE  id = ? AND status = 1`;
  const [popup] = await db(getPopup, [popupId]);
  if (!popup) return next(new AppError('No popup found', 404));

  req.popup = popup;
  next();
});

exports.uploadImage = multerInstance.single('popupImage');

exports.storeImage = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Upload popup image is required', 400));
  }

  const imageName = `${Date.now()}-${req.file.originalname.replace(/ /g, '-')}`;
  await sharp(req.file.buffer).toFile(`Uploads/PopupImages/${imageName}`);
  req.body.popupImage = imageName;
  next();
});

exports.updateImage = catchAsync(async (req, res, next) => {
  if (!req.file) {
    req.body.popupImage = req.popup.popup_image;
    return next();
  }
  const imagePath = `Uploads/PopupImages/${req.popup.popup_image}`;

  fs.unlink(imagePath, (err) => {});

  const imageName = `${Date.now()}-${req.file.originalname.replace(/ /g, '-')}`;
  await sharp(req.file.buffer).toFile(`Uploads/PopupImages/${imageName}`);
  req.body.popupImage = imageName;
  next();
});

const modifyBrandData = (req, popup) => ({
  id: popup.id,
  popup_name: popup.popup_name,
  popup_url: popup.popup_url,
  popup_image: `${req.protocol}://${req.get('host')}/api/images/popup/${
    popup.popup_image
  }`,
  is_active: popup.is_active,
  popup_btn_color: popup.popup_btn_color,
});

exports.currentPopup = catchAsync(async (req, res, next) => {
  const popupsQuery = `SELECT *
                        FROM azst_popups_table WHERE status = 1 And is_active = 1 ORDER BY created_on DESC Limit 1`;
  const result = await db(popupsQuery);
  if (result.length <= 0) return res.status(200).json({});
  const popup = modifyBrandData(req, result[0]);
  res.status(200).json(popup);
});

exports.getPopups = catchAsync(async (req, res, next) => {
  const popupsQuery = `SELECT *
                        FROM azst_popups_table WHERE status = 1`;
  const result = await db(popupsQuery);
  const popups = result.map((popup) => modifyBrandData(req, popup));
  res.status(200).json(popups);
});

exports.getPopup = catchAsync(async (req, res, next) => {
  const popup = modifyBrandData(req, req.popup);
  res.status(200).json(popup);
});

exports.addPopup = catchAsync(async (req, res, next) => {
  const { Name, Url, popupImage, btnColor } = req.body;

  const { error } = popupSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));

  const insertQuery = `INSERT INTO azst_popups_table (popup_name,popup_url,popup_image,popup_btn_color,updated_by) VALUES (?,?,?,?,?)`;

  const values = [Name, Url, popupImage, btnColor, req.empId];

  const result = await db(insertQuery, values);
  res.status(200).json({
    id: result.insertId,
    message: 'Popup added successfully',
  });
});

exports.updatePopup = catchAsync(async (req, res, next) => {
  const { Name, Url, popupImage, popupId, btnColor } = req.body;
  const { error } = popupSchema.validate({ Name, Url, popupImage, btnColor });
  if (error) return next(new AppError(error.message, 400));

  let updateQuery =
    'UPDATE azst_popups_table SET popup_name=?, popup_url =? ,popup_image=?,updated_by=?, popup_btn_color =?  where id =? ';
  let values = [Name, Url, popupImage, req.empId, btnColor, popupId];

  if (popupImage === '') {
    updateQuery = 'UPDATE popup_name=?, popup_url =? ,updated_by=?where id =? ';
    values = [Name, Url, req.empId, popupId];
  }

  await db(updateQuery, values);
  res.status(200).json({ message: 'Updated popup ' + Name });
});

exports.deletePopup = catchAsync(async (req, res, next) => {
  const { popupId } = req.body;
  if (!popupId) return next(new AppError('Popup Id is required', 400));

  const deletepopup =
    'UPDATE azst_popups_table SET status = 0, updated_by=? where id = ? ';

  const values = [req.empId, popupId];

  await db(deletepopup, values);
  res.status(200).json({ message: 'popup deleted Successfully ' });
});

exports.changeActiveStatus = catchAsync(async (req, res, next) => {
  const { popupId, activeStatus } = req.body;

  const changeQuery =
    'UPDATE azst_popups_table SET is_active = ?, updated_by=? where id = ? ';

  const values = [activeStatus, req.empId, popupId];

  await db(changeQuery, values);
  res.status(200).json({ message: 'popup status updated Successfully ' });
});
