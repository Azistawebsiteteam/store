const db = require('../Database/dbconfig');

const catchAsync = require('../Utils/catchAsync');
const AppError = require('../Utils/appError');


exports.createCallBack = catchAsync(async (req, res, next) => {
  const {
    name,
    mobileNumber,
    email,
    orgName,
    budget,
    requestQty,
    purposeOfPurchase,
    estimatedDeliveryDate,
    customerId = '',
  } = req.body;

  const values = [
    name,
    mobileNumber,
    email,
    orgName,
    budget,
    requestQty,
    purposeOfPurchase,
    estimatedDeliveryDate,
    customerId,
  ];

  const insertQuery = `INSERT INTO azst_callback_request_tbl 
                            (
                            azst_cbr_name,
                            azst_cbr_mobile_num,
                            azst_cbr_email,
                            azst_cbr_org_name,
                            azst_cbr_budget,
                            azst_cbr_qty,
                            azst_cbr_purpose_of_purchase,
                            azst_cbr_expt_delivery, azst_cbr_customer_id)
                        VALUES(?,?,?,?,?,?,?,?,? )`;

  const result = await db(insertQuery, values);

  res.status(200).json({
    callBackId: result.insertId,
    message: 'callback request raised.',
  });
});

exports.getCallBacks = catchAsync(async (req, res, next) => {
  const query = `SELECT azst_cbr_name,
                    azst_cbr_mobile_num,
                    azst_cbr_email,
                    azst_cbr_org_name,
                    azst_cbr_budget,
                    azst_cbr_qty,
                    azst_cbr_purpose_of_purchase,
                    azst_cbr_is_resolved,
                    DATE_FORMAT(azst_cbr_expt_delivery , '%d-%m-%Y')  as azst_cbr_expt_delivery_date ,
                    DATE_FORMAT(azst_cbr_created_on , '%d-%m-%Y') as azst_cbr_created_on
                  FROM  azst_callback_request_tbl 
                  WHERE  azst_cbr_is_resolved = 0 AND azst_cbr_status
                  ORDER BY azst_cbr_created_on DESC`;

  const callBacks = await db(query);
  res.status(200).json(callBacks);
});

exports.resovleCb = catchAsync(async (req, res, next) => {
  const { id, isResolve } = req.body;

  if (!id) return next(new AppError('callback id not provided', 400));

  const status = isResolve === 'true' ? 1 : 0;

  const query = `UPDATE  azst_callback_request_tbl  
                  SET azst_cbr_is_resolved = ? , azst_cbr_updated_by = ?
                  WHERE  azst_cbr_id = ? `;

  const values = [status, req.empId, id];
  const result = await db(query, values);

  if (result.affectedRows === 0)
    return next(new AppError('opps something wrong', 400));

  res
    .status(200)
    .json({ message: 'The callback status was updated successfully.' });
});

exports.deleteCallback = catchAsync(async (req, res, next) => {
  const { id, isResolve } = req.body;

  if (!id) return next(new AppError('callback id not provided', 400));

  const status = isResolve === 'true' ? 1 : 0;

  const query = `UPDATE  azst_callback_request_tbl  
                  SET azst_cbr_status = 0 , azst_cbr_updated_by = ?
                  WHERE  azst_cbr_id = ? `;

  const values = [req.empId, id];
  const result = await db(query, values);

  if (result.affectedRows === 0)
    return next(new AppError('opps something wrong', 400));

  res.status(200).json({ message: 'The callback  was Deleted successfully.' });
});

// Customer Query Operations Start From Here

exports.createCusQuery = catchAsync(async (req, res, next) => {
  const { name, email, mobileNumber, message, customerId = '' } = req.body;

  const query = `INSERT INTO azst_customer_queries_tbl (  azst_cusm_qr_name,
                  azst_cusm_qr_email,
                  azst_cusm_qr_mobile,
                  azst_cusm_qr_message,
                  azst_cusm_id) VALUES (?,?,?,?,?)`;

  const values = [name, email, mobileNumber, message, customerId];
  const result = await db(query, values);
  if (result.affectedRows === 0)
    return next(new AppError('Error while processing'));
  res.status(200).json({ message: 'Query raised' });
});

exports.getCusQuery = catchAsync(async (req, res, next) => {
  const query = `SELECT azst_cusm_qr_id,
                    azst_cusm_qr_name,
                    azst_cusm_qr_email,
                    azst_cusm_qr_mobile,
                    azst_cusm_qr_message,
                    azst_cusm_id,
                    DATE_FORMAT(azst_cusm_qr_created_on, '%d-%m-%Y') as azst_cusm_qr_created_on,
                    azst_cusm_qr_resolved
                  FROM azst_customer_queries_tbl
                  WHERE azst_cusm_qr_resolved = 0 AND  azst_cusm_qr_status = 1
                  ORDER BY azst_cusm_qr_updated_on DESC`;

  const cusQuires = await db(query);

  res.status(200).json(cusQuires);
});

exports.resovleQuery = catchAsync(async (req, res, next) => {
  const { id, isResolve } = req.body;

  if (!id) return next(new AppError('Query id not provided', 400));

  const status = isResolve === 'true' ? 1 : 0;

  const query = `UPDATE  azst_customer_queries_tbl  
                  SET azst_cusm_qr_resolved = ? , azst_cusm_qr_updated_by = ?
                  WHERE  azst_cusm_qr_id = ? `;

  const values = [status, req.empId, id];
  const result = await db(query, values);

  if (result.affectedRows === 0)
    return next(new AppError('opps something wrong', 400));

  res.status(200).json({ message: 'Query updated' });
});

exports.deleteQuery = catchAsync(async (req, res, next) => {
  const { id } = req.body;

  if (!id) return next(new AppError('callback id not provided', 400));

  const query = `UPDATE  azst_customer_queries_tbl  
                  SET azst_cusm_qr_status = 0, azst_cusm_qr_updated_by = ?
                  WHERE  azst_cusm_qr_id = ? `;

  const values = [req.empId, id];
  const result = await db(query, values);

  if (result.affectedRows === 0)
    return next(new AppError('opps something wrong', 400));

  res.status(200).json({ message: 'Query Deleted' });
});

// azst_cusm_qr_id,
//   azst_cusm_qr_name,
//   azst_cusm_qr_email,
//   azst_cusm_qr_mobile,
//   azst_cusm_qr_message,
//   azst_cusm_id,
//   azst_cusm_qr_created_on,
//   azst_cusm_qr_updated_on,
//   azst_cusm_qr_updated_by,
//   azst_cusm_qr_resolved,
//   azst_cusm_qr_status;

// azst_cbr_id,
//   azst_cbr_name,
//   azst_cbr_mobile_num,
//   azst_cbr_email,
//   azst_cbr_org_name,
//   azst_cbr_budget,
//   azst_cbr_qty,
//   azst_cbr_purpose_of_purchase,
//   azst_cbr_expt_delivery,
//   azst_cbr_created_on,
//   azst_cbr_updated_on,
//   azst_cbr_updated_by,
//   azst_cbr_is_resolved,
//   azst_cbr_status;
