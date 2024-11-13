const moment = require('moment');
const db = require('../../Database/dbconfig');
const { dbPool } = require('../../Database/dbPool');
const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');
const Sms = require('../../Utils/sms');
const { initiateRefund } = require('./retunsOrder');

exports.cancelOrder = catchAsync(async (req, res, next) => {
  const { orderId, reason } = req.body;
  if (!orderId || !reason) {
    return next(new AppError('orderId and reason are required', 400));
  }

  const cancelledBy = req.empId;
  const cancelDate = moment().format('YYYY-MM-DD HH:mm:ss');

  const getOrderDetailsQuery = `
    SELECT azst_orders_total, azst_orders_payment_method, azst_orders_checkout_id
    FROM azst_orders_tbl
    WHERE azst_orders_id = ?
      AND azst_orders_status = 1
      AND azst_orders_confirm_status <> 2
      AND azst_orders_delivery_status = 0`;

  try {
    const [orderDetails] = await dbPool.query(getOrderDetailsQuery, [orderId]);

    if (!orderDetails.length) {
      return next(new AppError("Order can't be cancelled at this stage", 400));
    }

    const {
      azst_orders_total,
      azst_orders_payment_method,
      azst_orders_checkout_id,
    } = orderDetails[0];

    let refundTrackId = null;

    // Start transaction
    await dbPool.query('START TRANSACTION');

    try {
      // Step 1: Update the order status to cancelled
      const cancelOrderQuery = `
        UPDATE azst_orders_tbl
        SET azst_orders_status = 0,
            azst_orders_cancelled_on = ?,
            azst_orders_cancelled_by = ?,
            azst_orders_cancelled_reason = ?
        WHERE azst_orders_id = ?`;

      const cancelOrderValues = [cancelDate, cancelledBy, reason, orderId];
      const [cancelResult] = await dbPool.query(
        cancelOrderQuery,
        cancelOrderValues
      );

      if (cancelResult.affectedRows === 0) {
        throw new Error('Failed to update order status');
      }

      // Step 2: If payment is not COD, initiate a refund
      if (azst_orders_payment_method !== 'COD') {
        const refundData = await initiateRefund(
          azst_orders_checkout_id,
          azst_orders_total
        );
        refundTrackId = refundData.id;

        // Step 3: Update the refund_track in the order record
        const updateRefundTrackQuery = `
          UPDATE azst_orders_tbl
          SET azst_orders_refund_track = ?
          WHERE azst_orders_id = ?`;
        const updateRefundTrackValues = [refundTrackId, orderId];
        await dbPool.query(updateRefundTrackQuery, updateRefundTrackValues);
      }

      // Step 4: Commit transaction if everything is successful
      await dbPool.query('COMMIT');

      // Send SMS notification
      const smsService = new Sms(cancelledBy, null);
      await smsService.getUserDetails();
      await smsService.orderCancel(orderId);

      res.status(200).json({
        message: 'Order was cancelled successfully',
        trackId: refundTrackId,
      });
    } catch (error) {
      // Roll back transaction in case of any error
      await dbPool.query('ROLLBACK');
      return next(
        new AppError(error.message || 'Order cancellation failed', 400)
      );
    }
  } catch (error) {
    return next(new AppError('Database operation failed', 500));
  }
});
