const moment = require('moment');
const db = require('../../dbconfig');

const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');

exports.istagexist = catchAsync(async (req, res, next) => {
  const { tagId } = req.body;
  if (!tagId) return next(new AppError('tag Id is Required', 400));
  const gettag = `SELECT azst_tag_id,azst_tag_name FROM azst_tags_tbl 
                  WHERE  azst_tag_id = ${tagId} AND azst_tag_status = 1`;
  const tag = await db(gettag);
  if (tag.length === 0) return next(new AppError('No tag found', 404));
  req.tag = tag[0];
  next();
});

exports.gettags = catchAsync(async (req, res, next) => {
  const tagQuery = `SELECT azst_tag_id,azst_tag_name 
                       FROM azst_tags_tbl WHERE azst_tag_status = 1`;

  const tags = await db(tagQuery);
  res.status(200).json(tags);
});

exports.gettag = catchAsync(async (req, res, next) => {
  res.status(200).json(req.tag);
});

exports.addtag = catchAsync(async (req, res, next) => {
  const { tagName } = req.body;

  if (!tagName) return next(new AppError('tag Name is Required', 400));

  const today = moment().format('YYYY-MM-DD HH:mm:ss');

  const imnsertQuery =
    'INSERT INTO  azst_tags_tbl (azst_tag_name,azst_tag_createdon,azst_tag_updateby) VALUES (?,?,?)';

  const values = [tagName, today, req.empId];

  const result = await db(imnsertQuery, values);
  res.status(200).json({ azst_tag_id: result.insertId });
});

exports.updatetag = catchAsync(async (req, res, next) => {
  const { tagId, tagName } = req.body;

  if (!tagName) return next(new AppError('tag Name is Required', 400));

  const updateQuery =
    'UPDATE azst_tags_tbl SET azst_tag_name=?, azst_tag_updateby=? where azst_tag_id =? ';
  const values = [tagName, req.empId, tagId];

  await db(updateQuery, values);
  res.status(200).json({ message: 'Updated tag ' + tagName });
});

exports.deletetag = catchAsync(async (req, res, next) => {
  const { tagId } = req.body;
  const deletetag =
    'UPDATE azst_tags_tbl SET azst_tag_status = 0, azst_tag_updateby=? where azst_tag_id = ? ';
  const values = [req.empId, tagId];

  await db(deletetag, values);
  res.status(200).json({ message: 'tag deleted Successfully ' });
});
