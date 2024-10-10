const axios = require('axios');
const moment = require('moment');
const db = require('../Database/dbconfig');
const AppError = require('./appError');

const getEstimateDates = async (pincode) => {
  const response = await axios.get(
    `https://api.postalpincode.in/pincode/${pincode}`
  );

  const { data } = response;
  const apiData = data[0];
  const { Status, Message, PostOffice } = apiData;

  if (Status !== 'Success')
    throw new AppError(`Invalid Pincode (or) ${Message}`, 400);

  if (!PostOffice) throw new AppError(`Invalid Pincode (or) ${Message}`, 400);

  const { State } = PostOffice[0];

  const query =
    'select azst_pin_days_number from  azst_pincode_no_of_days  Where azst_pin_days_state = ?';

  const result = await db(query, [State]);

  if (result.length === 0)
    throw new AppError('Please Enter a valid Pincode Number');
  const noOfDays = result[0].azst_pin_days_number;

  const expectedDateFrom = moment()
    .add(noOfDays, 'days')
    .format('DD MMM, YYYY');
  const expectedDateto = moment()
    .add(10 + noOfDays, 'days')
    .format('DD MMM, YYYY');

  return { expectedDateFrom, expectedDateto };
};

module.exports = getEstimateDates;
