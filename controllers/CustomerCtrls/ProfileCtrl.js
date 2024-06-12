const db = require('../../dbconfig');
const moment = require('moment');

const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');

exports.isUserExist = catchAsync(async (req, res, next) => {
  const { userId } = req.body;

  // userId is required came when Admin request to get user Details
  const id = userId ?? req.empId;

  const getUser =
    'Select *  from azst_customer where azst_customer_id  = ? AND azst_customer_status = 1';
  const result = await db(getUser, [id]);
  if (result.length === 0)
    return next(new AppError('No such customer was found', 404));
  req.userDetails = result[0];
  next();
});

const organizCustomerData = (customer) => {
  return {
    azst_customer_id: customer.azst_customer_id,
    azst_customer_fname: customer.azst_customer_fname,
    azst_customer_lname: customer.azst_customer_lname,
    azst_customer_mobile: customer.azst_customer_mobile,
    azst_customer_email: customer.azst_customer_email,
    azst_customer_hno: customer.azst_customer_hno,
    azst_customer_area: customer.azst_customer_area,
    azst_customer_city: customer.azst_customer_city,
    azst_customer_district: customer.azst_customer_district,
    azst_customer_state: customer.azst_customer_state,
    azst_customer_country: customer.azst_customer_country,
    azst_customer_zip: customer.azst_customer_zip,
    azst_customer_landmark: customer.azst_customer_landmark,
    azst_customer_acceptemail_marketing:
      customer.azst_customer_acceptemail_marketing,
    azst_customer_company: customer.azst_customer_company,
    azst_customer_address1: customer.azst_customer_address1,
    azst_customer_address2: customer.azst_customer_address2,
    azst_customer_acceptsms_marketing:
      customer.azst_customer_acceptsms_marketing,
    azst_customer_totalspent: customer.azst_customer_totalspent,
    azst_customer_totalorders: customer.azst_customer_totalorders,
    azst_customer_note: customer.azst_customer_note,
    azst_customer_taxexempts: customer.azst_customer_taxexempts,
    azst_customer_tags: customer.azst_customer_tags,
    azst_customer_gender: customer.azst_customer_gender,
    azst_customer_dob: moment(customer.azst_customer_DOB).format('DD-MM-YYYY'),
  };
};

exports.getCustomer = catchAsync(async (req, res, next) => {
  const customerData = organizCustomerData(req.userDetails);
  res.status(200).json({ customerData });
});

exports.updateProfile = catchAsync(async (req, res, next) => {
  const {
    firstName,
    lastName,
    mobileNum,
    email,
    houseNumber,
    area,
    city,
    district,
    state,
    country,
    zipCode,
    landmark,
    acceeptEmailMarketing,
    company,
    address1,
    address2,
    marketingSmsAccept,
    customerNote,
    taxExempts,
    tags,
    gender,
    dob,
  } = req.body;
  const profile = `UPDATE azst_customer SET  azst_customer_fname = ?, azst_customer_lname = ?, 
                        azst_customer_mobile = ?, azst_customer_email = ?, azst_customer_hno = ?,
                        azst_customer_area = ?, azst_customer_city = ?, azst_customer_district = ?,
                        azst_customer_state = ?, azst_customer_country = ?, azst_customer_zip = ?,
                        azst_customer_landmark = ?, azst_customer_acceptemail_marketing = ?,
                        azst_customer_company = ?, azst_customer_address1 = ?, azst_customer_address2 = ?,
                        azst_customer_acceptsms_marketing = ?, azst_customer_note = ?, 
                        azst_customer_taxexempts = ?, azst_customer_tags = ?,azst_customer_updatedon  = ?,
                        azst_customer_gender = ?, azst_customer_DOB = ?
                    WHERE azst_customer_id  = ?`;

  const today = moment().format('YYYY-MM-DD HH:mm:ss');

  const values = [
    firstName,
    lastName,
    mobileNum,
    email.toLowerCase(),
    houseNumber,
    area,
    city,
    district,
    state,
    country,
    zipCode,
    landmark,
    acceeptEmailMarketing,
    company,
    address1,
    address2,
    marketingSmsAccept,
    customerNote,
    taxExempts,
    tags,
    today,
    gender,
    dob,
    req.empId,
  ];

  await db(profile, values);
  res.status(200).send({ message: 'Profile updated successfully' });
});
