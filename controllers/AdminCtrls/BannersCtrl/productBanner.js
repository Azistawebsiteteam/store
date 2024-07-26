const moment = require('moment');
const db = require('../../../dbconfig');
const catchAsync = require('../../../Utils/catchAsync');
const AppError = require('../../../Utils/appError');

const getBannerImageLink = (req, img) =>
  `${req.protocol}://${req.get('host')}/api/images/banners/${img}`;

exports.getbanners = catchAsync(async (req, res, next) => {
  const date = moment().format('YYYY-MM-DD HH:mm:ss');
  const query = `SELECT banner_id,azst_web_image,azst_mobile_image,azst_background_url
                 FROM azst_banners_tbl WHERE status = 1 AND azst_banner_type = 'product' AND
                  '${date}' >= azst_start_time AND '${date}' <= azst_end_time
                 ORDER BY azst_createdon DESC`;

  const defaultsQuery = `SELECT banner_id,azst_web_image,azst_mobile_image,azst_background_url
                         FROM azst_banners_tbl
                         WHERE azst_banner_type = 'product' AND status = 1 AND is_default = 1
                         ORDER BY azst_createdon DESC`;

  let result = await db(query);
  if (result.length === 0) {
    result = await db(defaultsQuery);
  }

  const banners = result.map((b) => ({
    ...b,
    azst_web_image: getBannerImageLink(req, b.azst_web_image),
    azst_mobile_image: getBannerImageLink(req, b.azst_mobile_image),
  }));
  res.status(200).json(banners);
});

exports.getAllBanners = catchAsync(async (req, res, next) => {
  const defaultsQuery = `SELECT banner_id,azst_banner_title,azst_banner_description,
                            azst_web_image,azst_alt_text,azst_background_url,
                            DATE_FORMAT(azst_start_time, '%d-%m-%Y %H:%i:%s') as start_date,
                            DATE_FORMAT( azst_end_time, '%d-%m-%Y %H:%i:%s') as end_date,
                            status,is_default
                          FROM azst_banners_tbl
                          WHERE azst_banner_type = 'product'
                          ORDER BY azst_createdon DESC`;

  let result = await db(defaultsQuery);
  if (result.length === 0) {
    return next(new AppError('No banner found', 404));
  }
  const banners = result.map((b) => ({
    ...b,
    azst_web_image: getBannerImageLink(req, b.azst_web_image),
    azst_mobile_image: getBannerImageLink(req, b.azst_mobile_image),
  }));
  res.status(200).json(banners);
});
