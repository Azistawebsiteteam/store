const { optional } = require('joi');
const db = require('../../../dbconfig');

const AppError = require('../../../Utils/appError');
const catchAsync = require('../../../Utils/catchAsync');

exports.getInventoryQty = catchAsync(async (req, res, next) => {
  let { inventoryId, collection, orderbyKey, sort } = req.body;

  if (!inventoryId) return next(new AppError('inventoryId is required', 400));

  orderbyKey = orderbyKey ? orderbyKey : 'product_title';
  sort = sort ? sort : 'ASC';

  // Validating the orderbyKey and sort parameters
  const validOrderbyKeys = {
    producttitle: 'product_title',
    sku: 'sku_code',
    unavailable: 'azst_ipm_unavbl_quantity',
    available: 'azst_ipm_avbl_quantity',
    onhand: 'azst_ipm_onhand_quantity',
    commited: 'azst_ipm_commit_quantity',
  };

  const validSortOrders = ['ASC', 'DESC'];

  // Construct the orderbyQuery using validated inputs
  const orderbyQuery =
    validOrderbyKeys[orderbyKey.toLowerCase()] || 'product_title';
  const sortOrder = validSortOrders.includes(sort.toUpperCase())
    ? sort.toUpperCase()
    : 'DESC';

  let filterQuery = '';
  let queryParams = [inventoryId];

  if (collection) {
    filterQuery = `AND JSON_CONTAINS(collections, ?)`;
    queryParams.push(`"${collection}"`);
  }

  const invtQuery = `
    SELECT
      a.*,
      p.*,
      v.*
    FROM
      azst_inventory_product_mapping a
    LEFT JOIN
      azst_products p ON a.azst_ipm_product_id = p.id
    LEFT JOIN
      azst_sku_variant_info v ON a.azst_ipm_variant_id = v.id AND p.is_varaints_aval = 1
    WHERE
      a.azst_ipm_inventory_id = ?
    ${filterQuery}
    ORDER BY ${orderbyQuery} ${sortOrder}`;

  const result = await db(invtQuery, queryParams);

  const productsQuantity = result.map((product) => ({
    azst_ipm_id: product.azst_ipm_id,
    is_varaints_aval: product.is_varaints_aval,
    azst_ipm_inventory_id: product.azst_ipm_inventory_id,
    azst_ipm_product_id: product.azst_ipm_product_id,
    azst_ipm_variant_id: product.azst_ipm_variant_id,
    azst_ipm_onhand_quantity: product.azst_ipm_onhand_quantity,
    azst_ipm_avbl_quantity: product.azst_ipm_avbl_quantity,
    azst_ipm_commit_quantity: product.azst_ipm_commit_quantity,
    azst_ipm_unavbl_quantity: product.azst_ipm_unavbl_quantity,
    product_title: product.product_title,
    product_image: `${req.protocol}://${req.get('host')}/api/images/product/${
      product.image_src
    }`,
    sku_code:
      product.is_varaints_aval === 0 ? product.sku_code : product.variant_sku,

    variant_image: product.variant_image
      ? `${req.protocol}://${req.get('host')}/api/images/product/variantimage/${
          JSON.parse(product.variant_image)[0]
        }`
      : '',
    option1: product.option1,
    option2: product.option2,
    option3: product.option3,
  }));

  res.status(200).json(productsQuantity);
});

exports.updateInventory = catchAsync(async (req, res, next) => {
  const { changedInventories } = req.body;

  const handleQtyQuery = `UPDATE azst_inventory_product_mapping 
                          SET azst_ipm_onhand_quantity = ?, azst_ipm_avbl_quantity = ? 
                          WHERE azst_ipm_id = ?`;

  // Use a loop that handles asynchronous operations correctly
  for (const inv of changedInventories) {
    const { ipmId, onHandQty, availableQty } = inv;
    const values = [onHandQty, availableQty, ipmId];

    const result = await db(handleQtyQuery, values);

    if (result.affectedRows === 0) {
      return next(new AppError('opps something went wrong', 400));
    }
  }

  res.status(200).json({ message: 'Quantity Updated successfully' });
});

// azst_ipm_id,
//   azst_ipm_inventory_id,
//   azst_ipm_product_id,
//   azst_ipm_variant_id,
//   azst_ipm_onhand_quantity,
//   azst_ipm_avbl_quantity,
//   azst_ipm_commit_quantity,
//   azst_ipm_unavbl_quantity,
//   azst_ipm_created_by,
//   azst_ipm_updated_by,
//   azst_ipm_status,
//   azst_ipm_createdon,
//   azst_ipm_updateon;
