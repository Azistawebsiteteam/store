const db = require('../../Database/dbconfig');
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

  const homPage = `${showHomePageOnly}`.toLowerCase() === 'true' ? 1 : 0;

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
  const homPage = `${showHomePageOnly}`.toLowerCase() === 'true' ? 1 : 0;
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
  const filter = req.empId ? '' : 'WHERE announcement_status = 1';
  const annoucementsQuery = `SELECT  announcement_id,   announcement_web_text,   
                                  announcement_mobile_text,announcement_web_link,
                                  announcement_background_color, announcement_text_color,
                                  announcement_show_homepage_only, announcement_status
                              FROM azst_announcements_tbl ${filter} `;

  const results = await db(annoucementsQuery);
  res.status(200).json(results);
});

exports.changeAnnoucementViewStatus = catchAsync(async (req, res, next) => {
  const { error } = viewStatusSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));

  const { announcementId, showAnnouncement } = req.body;

  const isShow = `${showAnnouncement}`.toLowerCase() === 'true' ? 1 : 0;

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

exports.deleteAnnoucement = catchAsync(async (req, res, next) => {
  const { announcementId } = req.body;
  if (!announcementId)
    return next(new AppError('announcementId is required', 404));

  const deleteQuery = `DELETE FROM azst_announcements_tbl  WHERE announcement_id = ?`;

  // Execute the query
  const result = await db(deleteQuery, [announcementId]);

  // Check if a row was actually deleted
  if (result.affectedRows === 0) {
    return next(new AppError('Announcement not found', 404));
  }

  // Return success response
  res.status(200).json({ message: 'Announcement deleted successfully' });
});
