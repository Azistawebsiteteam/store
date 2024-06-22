const db = require('../../dbconfig');
const AppError = require('../../Utils/appError');

const catchAsync = require('../../Utils/catchAsync');

const organizCustomerData = require('../CustomerCtrls/datafunctions');

exports.getAllCustomers = catchAsync(async (req, res, next) => {
  let { isActive, orderbyKey, sort } = req.body;

  orderbyKey = orderbyKey ? orderbyKey : 'azst_customer_createdon';

  sort = sort ? sort : 'DESC';

  // Validating the orderbyKey and sort parameters
  const validOrderbyKeys = {
    totalorder: 'azst_customer_totalorders',
    totalamountspent: 'azst_customer_totalspent',
    lastupdated: 'azst_customer_updatedon',
    default: 'azst_customer_createdon ',
  };

  const validSortOrders = ['ASC', 'DESC'];

  // Construct the orderbyQuery using validated inputs
  const orderbyQuery =
    validOrderbyKeys[orderbyKey.toLowerCase()] || validOrderbyKeys.default;

  const sortOrder = validSortOrders.includes(sort.toUpperCase())
    ? sort.toUpperCase()
    : 'DESC';

  // Construct the filterQuery securely using parameterized queries
  let filterQuery = '';
  let queryParams = [];
  if (typeof isActive !== 'undefined') {
    filterQuery = 'WHERE azst_customer_status = ?';
    queryParams.push(isActive);
  }

  const getUsers = `
    SELECT 
      azst_customer_id,
      azst_customer_fname,
      azst_customer_lname,
      azst_customer_mobile,
      azst_customer_email,
      azst_customer_acceptemail_marketing,
      azst_customer_status,
      DATE_FORMAT(azst_customer_createdon, '%d-%m-%Y %H:%i:%s') as registered_on,
      azst_customer_gender,
      azst_customer_state,
      azst_customer_country,
      azst_customer_totalspent,
      azst_customer_totalorders
    FROM azst_customer
    ${filterQuery}
    ORDER BY ${orderbyQuery} ${sortOrder}`;

  const users = await db(getUsers, queryParams);
  res.status(200).json(users);
});

exports.disableCustomer = catchAsync(async (req, res, next) => {
  const { userId } = req.body;

  if (!userId) return next(new AppError('User Id is required'));

  const disableQuery = `UPDATE azst_customer SET azst_customer_status = 0 , azst_customer_updatedby =? WHERE azst_customer_id = ?`;
  const response = await db(disableQuery, [req.empId, userId]);
  if (response.affectedRows > 0) {
    res.status(200).json({ message: 'User Account successfully disabled.' });
  } else {
    res.status(404).json({ message: 'User Account not found.' });
  }
});

exports.deleteCustomer = catchAsync(async (req, res, next) => {
  const { userId } = req.body;

  if (!userId) return next(new AppError('User Id is required'));

  const deleteQuery = `
    DELETE FROM azst_customer 
    WHERE azst_customer_id = ? AND azst_customer_totalorders = 0
  `;

  const response = await db(deleteQuery, [userId]);

  if (response.affectedRows > 0)
    return res
      .status(200)
      .json({ message: 'User Account successfully deleted.' });
  next(
    new AppError(
      `This can't be deleted because they have personal orders.`,
      400
    )
  );
});

exports.getUserDetailsAndLastOrder = catchAsync(async (req, res, next) => {
  const { userId } = req.body;

  const customerData = organizCustomerData(req.userDetails);

  const ordersQuery = `SELECT * FROM azst_orders_tbl 
                      WHERE azst_orders_customer_id = ? 
                      ORDER BY azst_orders_created_on DESC LIMIT 1`;
  const order = await db(ordersQuery, [userId]);

  res.status(200).json({ customerData, latestOrder: order[0] ?? {} });
});

// azst_customer_id,
//   azst_customer_fname,
//   azst_customer_lname,
//   azst_customer_mobile,
//   azst_customer_email,
//   azst_customer_pwd,
//   azst_customer_hno,
//   azst_customer_area,
//   azst_customer_city,
//   azst_customer_district,
//   azst_customer_state,
//   azst_customer_country,
//   azst_customer_zip,
//   azst_customer_landmark,
//   azst_customer_acceptemail_marketing,
//   azst_customer_company,
//   azst_customer_address1,
//   azst_customer_address2,
//   azst_customer_acceptsms_marketing,
//   azst_customer_totalspent,
//   azst_customer_totalorders,
//   azst_customer_note,
//   azst_customer_taxexempts,
//   azst_customer_tags,
//   azst_customer_status,
//   azst_customer_createdon,
//   azst_customer_updatedon,
//   azst_customer_gender,
//   azst_customer_DOB;
//  azst_customer_updatedby,
