const moment = require('moment');
const axios = require('axios');

const { dbPool } = require('../../Database/dbPool');
const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');
const Sms = require('../../Utils/sms');
const { initiateRefund } = require('./retunsOrder');
const {
  rollbackTransaction,
  commitTransaction,
  startTransaction,
} = require('../../Utils/transctions');

const { getShipToken } = require('../../shipRocket/shipInstance');

exports.cancelOrder = catchAsync(async (req, res, next) => {
  const { orderId, reason } = req.body;

  // Validate input
  if (!orderId || !reason) {
    return next(
      new AppError('Order ID and cancellation reason are required', 400)
    );
  }

  const cancelledBy = req.empId;
  const cancelDate = moment().format('YYYY-MM-DD HH:mm:ss');

  // Query to fetch order details
  const getOrderDetailsQuery = `
    SELECT azst_orders_total, azst_orders_payment_method, azst_orders_checkout_id,
           azst_order_ship_from, azst_order_ship_method, azst_order_shipment_id
    FROM azst_orders_tbl as OT
    LEFT JOIN azst_orderinfo_tbl OIT ON OT.azst_orders_id = OIT.azst_orders_id
    WHERE OT.azst_orders_id = ?
      AND OT.azst_orders_status = 1
      AND OT.azst_orders_confirm_status <> 2
      AND OT.azst_orders_delivery_status = 0`;

  try {
    const [orderDetails] = await dbPool.query(getOrderDetailsQuery, [orderId]);

    // Validate if order can be canceled
    if (!orderDetails.length) {
      return next(new AppError("Order can't be cancelled at this stage", 400));
    }

    const {
      azst_orders_total,
      azst_orders_payment_method,
      azst_orders_checkout_id,
      azst_order_ship_from,
      azst_order_ship_method,
      azst_order_shipment_id,
    } = orderDetails[0];

    let refundTrackId = null;

    // Start database transaction
    await startTransaction();
    try {
      // Update order status to cancelled
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

      // Initiate refund if payment is not COD
      if (azst_orders_payment_method !== 'COD') {
        const refundData = await initiateRefund(
          azst_orders_checkout_id,
          azst_orders_total
        );

        refundTrackId = refundData?.id;

        const updateRefundTrackQuery = `
        UPDATE azst_orders_tbl
        SET azst_orders_refund_track = ?
        WHERE azst_orders_id = ?`;

        await dbPool.query(updateRefundTrackQuery, [refundTrackId, orderId]);
      }

      let message = 'Order cancelled successfully.';

      // Update inventory quantities if applicable
      if (azst_order_ship_from) {
        req.body.inventoryId = azst_order_ship_from;
        await exports.updateOrderQuantity(req, res, next);
      }

      if (azst_order_shipment_id) {
        // Handle shipment cancellation if applicable
        req.shipment_id = azst_order_shipment_id;
        message = await exports.shipRocketCancel(req, res, next);
      }

      // Commit transaction
      await commitTransaction();

      // Send SMS notification
      const smsService = new Sms(cancelledBy, null);
      await smsService.getUserDetails();
      await smsService.orderCancel(orderId);

      res.status(200).json({
        message,
        trackId: refundTrackId,
      });
    } catch (error) {
      // Rollback transaction on failure
      await rollbackTransaction();
      return next(
        new AppError(error.message || 'Order cancellation failed', 500)
      );
    }
  } catch (error) {
    next(new AppError('Database operation failed', 500));
  }
});

exports.updateOrderQuantity = async (req, res, next) => {
  const { orderId, inventoryId } = req.body;

  // Validate input
  if (!orderId || !inventoryId) {
    throw new AppError('Order ID and Inventory ID are required', 400);
  }

  try {
    // Fetch products associated with the order
    const query = `
      SELECT azst_order_product_id, azst_order_variant_id, azst_order_qty 
      FROM azst_ordersummary_tbl 
      WHERE azst_orders_id = ?`;
    const [products] = await dbPool.query(query, [orderId]);

    // Validate if any products are found
    if (!products.length) {
      throw new AppError('No products found for the specified order ID', 404);
    }

    // Prepare bulk update queries
    const updates = products.map(
      ({ azst_order_product_id, azst_order_variant_id, azst_order_qty }) => {
        const qty = parseInt(azst_order_qty, 10);
        const values = [
          qty,
          qty,
          inventoryId,
          azst_order_product_id,
          azst_order_variant_id,
        ];

        return {
          query: `
          UPDATE azst_inventory_product_mapping 
          SET azst_ipm_onhand_quantity = azst_ipm_onhand_quantity + ?,
              azst_ipm_commit_quantity = azst_ipm_commit_quantity - ?
          WHERE azst_ipm_inventory_id = ? AND azst_ipm_product_id = ? AND azst_ipm_variant_id = ?`,
          values,
        };
      }
    );

    // Execute updates in parallel
    const updatePromises = updates.map(({ query, values }) =>
      dbPool.query(query, values)
    );
    await Promise.all(updatePromises);
  } catch (error) {
    throw new AppError(
      error.message || 'Failed to update order quantities',
      500
    );
  }
};

exports.shipRocketCancel = async (req, res, next) => {
  try {
    const token = await getShipToken();
    if (!token) {
      throw new AppError('Failed to retrieve ShipRocket token', 500);
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const body = {
      ids: [req.shipment_id],
    };

    const url = `https://apiv2.shiprocket.in/v1/external/orders/cancel`;
    const response = await axios.post(url, body, { headers });
    if (!response?.data?.message) {
      throw new Error('Failed to cancel shipment via ShipRocket');
    }

    return response.data.message;
  } catch (error) {
    throw new AppError(error.message || 'ShipRocket cancellation failed', 500);
  }
};
