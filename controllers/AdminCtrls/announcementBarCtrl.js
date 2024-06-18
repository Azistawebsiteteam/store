const db = require('../../dbconfig');
const Joi = require('joi');

const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');

const announcementSchema = Joi.object({
  webText: Joi.string().min(10).required(),
  mobileText: Joi.string().min(10).required(),
  webLink: Joi.string().optional(),
  backgroundCrl: Joi.string().optional(),
  textCrl: Joi.string().optional(),
  startTime: Joi.string().optional(),
  endTime: Joi.string().optional(),
  showHomePageOnly: Joi.boolean().optional(),
});

const announcementUpdateSchema = announcementSchema.keys({
  announcementId: Joi.number().required(),
});

const viewStatusSchema = Joi.object({
  announcementId: Joi.number().required(),
  showAnnouncement: Joi.boolean().required(),
});

exports.addAnnoucement = catchAsync(async (req, res, next) => {
  const { error } = announcementSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));

  const {
    webText,
    mobileText,
    webLink,
    backgroundCrl,
    textCrl,
    startTime,
    endTime,
    showHomePageOnly,
  } = req.body;
  const { empId } = req;
  const values = [
    webText,
    mobileText,
    webLink,
    backgroundCrl,
    textCrl,
    startTime,
    endTime,
    showHomePageOnly ? 1 : 0,
    empId,
  ];

  const insertQuery = `INSERT INTO azst_announcements_tbl (
                            announcement_web_text,
                            announcement_mobile_text,
                            announcement_web_link,
                            announcement_background_color,
                            announcement_text_color,
                            announcement_start_time,
                            announcement_end_time,
                            announcement_show_homepage_only,
                            announcement_created_by)
                        VALUES(?,?,?,?,?,?,?,?,?) `;
  const response = await db(insertQuery, values);

  if (response.affectedRows === 1) {
    return res.status(201).json({ message: 'Annoucement Added successfully' });
  }

  next(new AppError('oops something went wrong', 400));
});

exports.updateAnnoucement = catchAsync(async (req, res, next) => {
  const { error } = announcementUpdateSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));
  const {
    announcementId,
    webText,
    mobileText,
    webLink,
    backgroundCrl,
    textCrl,
    startTime,
    endTime,
    showHomePageOnly,
  } = req.body;

  const { empId } = req;
  const homPage = showHomePageOnly.toLowerCase() === 'true' ? 1 : 0;
  const values = [
    webText,
    mobileText,
    webLink,
    backgroundCrl,
    textCrl,
    startTime,
    endTime,
    homPage,
    empId,
    announcementId,
  ];

  const insertQuery = `UPDATE azst_announcements_tbl SET 
                            announcement_web_text = ? ,
                            announcement_mobile_text = ?,
                            announcement_web_link = ?,
                            announcement_background_color = ? ,
                            announcement_text_color = ? ,
                            announcement_start_time = ? ,
                            announcement_end_time = ? ,
                            announcement_show_homepage_only =?,
                            announcement_updated_by = ?
                        WHERE announcement_id = ? `;
  const response = await db(insertQuery, values);

  if (response.affectedRows === 1) {
    return res
      .status(200)
      .json({ message: 'Annoucement Updated successfully' });
  }

  next(new AppError('oops something went wrong', 400));
});

exports.getAnnouncementDetails = catchAsync(async (req, res, next) => {
  const { announcementId } = req.body;

  const insertQuery = `SELECT * FROM  azst_announcements_tbl 
                        WHERE announcement_id = ? `;
  const response = await db(insertQuery, [announcementId]);
  response.length > 0
    ? res.status(200).json(response[0])
    : res.status(404).json({ message: 'no announcement found' });
});

exports.getAnnoucements = catchAsync(async (req, res, next) => {
  const annoucementsQuery = `SELECT  announcement_id,   announcement_web_text,   
                                  announcement_mobile_text,announcement_web_link,
                                  announcement_background_color, announcement_text_color,
                                  announcement_show_homepage_only
                              FROM azst_announcements_tbl WHERE announcement_status = 1`;

  const results = await db(annoucementsQuery);
  res.status(200).json(results);
});

exports.changeAnnoucementViewStatus = catchAsync(async (req, res, next) => {
  const { error } = viewStatusSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));

  const { announcementId, showAnnouncement } = req.body;

  const isShow = showAnnouncement.toLowerCase() === 'true' ? 1 : 0;

  const values = [isShow, announcementId];
  const changeStatusQuery = `UPDATE azst_announcements_tbl SET  announcement_status = ?
                             WHERE announcement_id = ?`;

  const results = await db(changeStatusQuery, values);
  if (results.affectedRows === 1) {
    return res
      .status(200)
      .json({ message: 'Annoucement Updated successfully' });
  }

  next(new AppError('oops something went wrong', 400));
});

// announcement_id,
//   announcement_web_text,
//   announcement_mobile_text,
//   announcement_web_link,
//   announcement_background_color,
//   announcement_text_color,
//   announcement_start_time,
//   announcement_end_time,
//   announcement_created_on,
//   announcement_updated_on,
//   announcement_created_by,
//   announcement_updated_by,
//   announcement_status,
//   announcement_show_homepage_only;
