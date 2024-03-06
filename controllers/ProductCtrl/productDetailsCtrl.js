const db = require('../../dbconfig');

const catchAsync = require('../../Utils/catchAsync');

const getProductImageLink = (req, product) => ({
  ...product,
  image_src: `${req.protocol}://${req.get('host')}/product/thumbnail/${
    product.image_src
  }`,
});

exports.getCollectionProducts = catchAsync(async (req, res, next) => {
  const { collectionId } = req.body; // Assuming collectionId is a single value

  const getProducts = `SELECT id as product_id, display_name, short_name, product_name, vendor_id, 
                        type, tags, DATE_FORMAT(published, '%d-%m-%Y') AS published_date, image_src,image_position,
                        image_alt_text,cost_per_item, price_india, status
                       FROM azst_products
                       WHERE product_category ->> '$[*]' LIKE CONCAT('%', ?, '%')  AND azst_products.status = 1`;

  const results = await db(getProducts, [collectionId]);

  if (results.length === 0)
    return res.status(200).json({ products: [], message: 'No product found' });

  const products = results.map((product) => getProductImageLink(req, product));
  res.status(200).json({ products, message: 'Data retrieved successfully.' });
});

exports.getProductsSerach = catchAsync(async (req, res, next) => {
  const { searchText } = req.body; // Assuming collectionId is a single value

  const getProducts = `SELECT id as product_id, display_name, short_name, product_name, vendor_id, 
                          type, tags, DATE_FORMAT(published, '%d-%m-%Y') AS published_date, 
                          image_src, image_position, image_alt_text, cost_per_item, price_india
                        FROM azst_products
                        WHERE (display_name LIKE '%${searchText}%' OR 
                          short_name LIKE '%${searchText}%' OR 
                          product_name LIKE '%${searchText}%' OR
                          tags LIKE '%${searchText}%')
                          AND azst_products.status = 1;`;

  const results = await db(getProducts);

  if (results.length === 0)
    return res.status(200).json({ products: [], message: 'No product found' });

  const products = results.map((product) => ({
    ...product,
    image_src: `${req.protocol}://${req.get('host')}/product/thumbnail/${
      product.image_src
    }`,
  }));
  res.status(200).json({ products, message: 'Data retrieved successfully.' });
});

// azst_vendor_details.azst_vendor_name;

//  JOIN azst_product_details ON azst_products.id = azst_product_details.product_id
//             JOIN azst_vendor_details ON azst_products.vendor_id = azst_vendor_details.azst_vendor_id

exports.getProductDetalis = catchAsync(async (req, res, next) => {
  const { productId } = req.body;

  const getproductDetails = `SELECT 
            azst_products.display_name,
            azst_products.short_name,
            azst_products.product_name,
            azst_products.type,
            azst_products.tags,
            azst_products.product_images,
            azst_product_details.product_id,
            azst_product_details.product_description,
            azst_product_details.product_highlights,
            azst_product_details.product_ingredients,
            azst_product_details.product_benefits,
            azst_product_details.product_how_to_use,
            azst_product_details.product_specifications,
            azst_vendor_details.azst_vendor_name
            
          FROM azst_products
          LEFT JOIN azst_product_details ON azst_products.id = azst_product_details.product_id
          LEFT JOIN azst_vendor_details ON azst_products.vendor_id = azst_vendor_details.azst_vendor_id
          WHERE azst_products.id = ? AND azst_products.status = 1`;

  const getVariants = `SELECT azst_sku_variant_info.id as varient_id,variant_image, variant_weight_unit, 
                       variant_HS_code, variant_barcode, variant_sku, variant_grams, variant_inventory_tracker,
                       variant_inventory_policy, variant_fulfillment_service, variant_requires_shipping,
                       variant_taxable, color, size, actual_price, offer_price, offer_percentage
                      FROM  azst_sku_variant_info WHERE product_id = ? AND status = 1`;

  const results = await db(getproductDetails, [productId]);

  if (results.length === 0)
    return res
      .status(200)
      .json({ productDetails: {}, message: 'No product found' });

  const product = results[0];

  const productDetails = {
    ...product,
    product_images: JSON.parse(product.product_images).map(
      (product_image) =>
        `${req.protocol}://${req.get('host')}/product/images/${product_image}`
    ),
  };

  const result = await db(getVariants, [productId]);
  const variants = result.map((variant) => ({
    ...variant,
    variant_image: `${req.protocol}://${req.get('host')}/product/variantimage/${
      variant.variant_image
    }`,
    variant_barcode: `${req.protocol}://${req.get(
      'host'
    )}/variant/barcode/image/${variant.variant_barcode}`,
  }));
  res.status(200).json({
    productDetails,
    variants,
    message: 'Data retrieved successfully.',
  });
});
