const moment = require('moment');
const db = require('../../Database/dbconfig');
const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');

exports.cancelOrder = catchAsync(async (req, res, next) => {
  const { orderId, reason } = req.body;

  if (!orderId || !reason) {
    next(new AppError('orderId and reason are required', 400));
  }

  const cancelledBy = req.empId;

  const cancelDate = moment().format('YYYY-MM-DD HH:mm:ss');

  const query = `UPDATE  azst_orders_tbl 
                SET azst_orders_status = 0 , azst_orders_cancelled_on = ? ,
                    azst_orders_cancelled_by = ? , azst_orders_cancelled_reason = ?
                WHERE azst_orders_id = ?`;

  const values = [cancelDate, cancelledBy, reason, orderId];

  const result = await db(query, values);

  if (result.affectedRows > 0) {
    res.status(200).json({ message: 'orders was cancelled successfully' });
  } else {
    res.status(404).json({ message: 'oops, something went wrong' });
  }
});
