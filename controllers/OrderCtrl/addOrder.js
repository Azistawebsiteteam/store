const { default: axios } = require('axios');
const db = require('../../dbconfig');
const Joi = require('joi');
const moment = require('moment');

const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');

const pinocdeSchema = Joi.object({
  pincode: Joi.number().integer().min(100000).max(999999).messages({
    'number.min': 'Must be a 6-digit number',
    'number.max': 'Must be a 6-digit number',
  }),
});

exports.getEstimateDate = catchAsync(async (req, res, next) => {
  const { pincode } = req.body;

  if (!pincode) return next(new AppError('Pincode is required'));

  const { error } = pinocdeSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));

  const response = await axios.get(
    `https://api.postalpincode.in/pincode/${pincode}`
  );

  const { data } = response;
  const apiData = data[0];
  const { Status, Message, PostOffice } = apiData;

  if (Status !== 'Success')
    return next(new AppError(`Invalid Pincode (or) ${Message}`, 400));

  if (!PostOffice)
    return next(new AppError(`Invalid Pincode (or) ${Message}`, 400));

  const { State } = PostOffice[0];

  const query =
    'select azst_pin_days_number from  azst_pincode_no_of_days  Where azst_pin_days_state = ?';

  const result = await db(query, [State]);

  if (result.length === 0)
    return next(new AppError('Please Enter a valid Pincode Number'));
  const noOfDays = result[0].azst_pin_days_number;

  const expectedDateFrom = moment()
    .add(noOfDays, 'days')
    .format('DD MMM, YYYY');
  const expectedDateto = moment()
    .add(10 + noOfDays, 'days')
    .format('DD MMM, YYYY');

  res.status(200).json({ expectedDateFrom, expectedDateto });
});

// azst_pin_days_id,
//   azst_pin_days_state,
//   azst_pin_days_number,
//   azst_pin_days_created_on;
