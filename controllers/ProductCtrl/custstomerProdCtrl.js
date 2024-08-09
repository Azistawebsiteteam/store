const db = require('../../dbconfig');
const Joi = require('joi');
const AppError = require('../../Utils/appError');

const catchAsync = require('../../Utils/catchAsync');

const getProductImageLink = (req, product) => ({
  ...product,
  image_src: `${req.protocol}://${req.get('host')}/api/images/product/${
    product.image_src
  }`,
});

const filtersSchema = Joi.object({
  collectionId: Joi.number().optional(),
  categoryId: Joi.number().optional(),
  brandId: Joi.number().optional(),
  productQty: Joi.string().optional().valid('All', 'inStock'),
  orderBy: Joi.string().optional().valid('ASC', 'DESC'),
  reviewpoint: Joi.number().optional(),
});

exports.getCollectionProducts = catchAsync(async (req, res, next) => {
  // Validate request body using filtersSchema
  const { error } = filtersSchema.validate(req.body);
  if (error) return next(new AppError(error.message, 400));

  // Destructure filters and default values from request body
  const {
    collectionId,
    categoryId,
    brandId,
    orderBy = 'ASC',
    reviewpoint,
    productQty,
  } = req.body;

  // Initialize arrays to store SQL filter conditions and values
  const filters = [];
  const values = [];

  // Build filters based on provided parameters

  // Filter by collectionId if provided
  if (collectionId) {
    filters.push(`JSON_CONTAINS(collections, JSON_QUOTE(?), '$')`);
    values.push(collectionId.toString());
  }

  // Filter by categoryId if provided
  if (categoryId) {
    filters.push(`product_category = ?`);
    values.push(categoryId);
  }

  // Filter by brandId if provided
  if (brandId) {
    filters.push(`brand_id = ?`);
    values.push(brandId);
  }

  // Construct the WHERE clause for SQL query
  const filterQuery = `WHERE azst_products.status = 1 ${
    filters.length > 0 ? 'AND ' + filters.join(' OR ') : ''
  }`;

  // Define the ORDER BY clause for SQL query
  const sortByQuery = `ORDER BY price ${orderBy}`;

  // Initialize array for HAVING clause conditions
  const havingValues = [];

  // Filter by reviewpoint if provided
  if (reviewpoint) {
    havingValues.push(`AVG(prt.review_points) >= ?`);
    values.push(reviewpoint);
  }

  // Filter by productQty if set to 'inStock'
  if (productQty === 'inStock') {
    havingValues.push(`SUM(pi.azst_ipm_onhand_quantity) > 0`);
  }

  // Construct the HAVING clause for SQL query
  const havingQuery =
    havingValues.length > 0 ? 'HAVING ' + havingValues.join(' AND ') : '';

  // Construct the main SQL query to fetch products with applied filters and sorting
  const getProducts = `
    SELECT 
      azst_products.id AS product_id,
      product_main_title,
      min_cart_quantity,
      max_cart_quantity,
      product_title,
      image_src,
      image_alt_text,
      price,
      compare_at_price,
      product_url_title,
      CASE 
        WHEN azst_wishlist_tbl.azst_product_id IS NOT NULL THEN true
        ELSE false
      END AS in_wishlist,
      COALESCE(AVG(prt.review_points), 0) AS product_review_points,
      COALESCE(SUM(pi.azst_ipm_onhand_quantity), 0) AS product_qty
    FROM azst_products
    LEFT JOIN azst_wishlist_tbl 
      ON azst_products.id = azst_wishlist_tbl.azst_product_id
    LEFT JOIN product_review_rating_tbl AS prt
      ON azst_products.id = prt.product_id
    LEFT JOIN azst_inventory_product_mapping AS pi 
      ON azst_products.id = pi.azst_ipm_product_id
    ${filterQuery}
    GROUP BY 
      azst_products.id,
      product_main_title,
      product_title,
      image_src,
      image_alt_text,
      price,
      compare_at_price,
      product_url_title
    ${havingQuery}
    ${sortByQuery}
  `;

  // Determine which collection to query for additional collection data
  let collectionQuery = '';
  let filtValue = '';

  // Construct collection data query based on categoryId, brandId, or collectionId
  if (categoryId) {
    collectionQuery = `SELECT azst_category_name AS azst_collection_title, azst_category_description AS azst_collection_description
                       FROM azst_category_tbl WHERE azst_category_id = ?`;
    filtValue = categoryId;
  } else if (brandId) {
    collectionQuery = `SELECT azst_brand_name AS azst_collection_title, azst_brand_description AS azst_collection_description
                       FROM azst_brands_tbl WHERE azst_brands_id = ?`;
    filtValue = brandId;
  } else {
    collectionQuery = `SELECT azst_collection_name AS azst_collection_title, azst_collection_content AS azst_collection_description
                       FROM azst_collections_tbl WHERE azst_collection_id = ?`;
    filtValue = collectionId;
  }

  // Execute the main product query with filters and sorting
  const results = await db(getProducts, values);

  // Execute the query to get collection data
  const collectionData = await db(collectionQuery, [filtValue]);

  // Prepare the collection data response
  const collection = collectionData.length > 0 ? collectionData[0] : {};

  // Process the product results to include image links
  const products = results.map((product) => getProductImageLink(req, product));

  // Send the final response
  res.status(200).json({
    products,
    collection_data: collection,
    message: 'Data retrieved successfully.',
  });
});

exports.shop99Products = catchAsync(async (req, res, next) => {
  const getProducts = `SELECT id as product_id, product_main_title, product_title, image_src,
                        image_alt_text, price, compare_at_price, product_url_title,min_cart_quantity,
                        max_cart_quantity,
                        CASE 
                          WHEN wl.azst_product_id IS NOT NULL THEN true
                          ELSE false
                        END AS in_wishlist
                       FROM azst_products
                       LEFT JOIN azst_wishlist_tbl as wl ON azst_products.id = wl.azst_product_id  AND wl.status = 1
                       WHERE azst_products.status = 1 
                       AND JSON_CONTAINS(collections, JSON_QUOTE('25'), '$')`;

  const results = await db(getProducts);
  const products = results.map((product) => getProductImageLink(req, product));

  res.status(200).json(products);
});

exports.getBestSeller = catchAsync(async (req, res, next) => {
  const query = `SELECT id as product_id, product_title,product_main_title, image_src,
                    image_alt_text, price, compare_at_price, product_url_title,min_cart_quantity,
                    max_cart_quantity,COUNT(azst_ordersummary_tbl.azst_order_product_id) AS no_of_orders,
                    CASE 
                      WHEN wl.azst_product_id IS NOT NULL THEN true
                      ELSE false
                    END AS in_wishlist
                 FROM azst_ordersummary_tbl
                 LEFT JOIN azst_products ON azst_products.id = azst_ordersummary_tbl.azst_order_product_id
                 LEFT JOIN azst_wishlist_tbl AS wl ON azst_products.id = wl.azst_product_id AND wl.status = 1
                 WHERE  azst_products.status = 1
                 GROUP BY azst_ordersummary_tbl.azst_order_product_id
                 ORDER BY  no_of_orders DESC
                 Limit 8
                 `;

  const results = await db(query);
  const products = results.map((product) => getProductImageLink(req, product));
  res.status(200).json(products);
});

exports.getProductsSerach = catchAsync(async (req, res, next) => {
  const { searchText } = req.body;
  if (searchText === '') {
    res.status(200).json({ products: [], message: 'No product found' });
    return;
  }

  const getProducts = `SELECT product_title,image_src,price,product_main_title,product_url_title
                        FROM azst_products
                        WHERE (product_title LIKE '%${searchText}%' OR 
                            product_category LIKE '%${searchText}%' OR 
                            type LIKE '%${searchText}%' OR
                            tags LIKE '%${searchText}%' OR
                            collections LIKE '%${searchText}%') 
                            AND azst_products.status = 1;`;

  const results = await db(getProducts);

  if (results.length === 0)
    return res.status(200).json({ products: [], message: 'No product found' });

  const products = results.map((product) => getProductImageLink(req, product));

  res.status(200).json({ products, message: 'Data retrieved successfully.' });
});

exports.getProductDetalis = catchAsync(async (req, res, next) => {
  const { productId } = req.body;

  const getproductDetails = `SELECT 
                              azst_products.*, 
                              (
                                SELECT JSON_ARRAYAGG(
                                  JSON_OBJECT(
                                    'ingredient_id', azst_product_ingredients.id,
                                    'title', azst_product_ingredients.title,
                                    'description', azst_product_ingredients.description,
                                    'image',  CONCAT('${
                                      req.protocol
                                    }://${req.get(
    'host'
  )}/api/images/ingredients/', azst_product_ingredients.image)
                                                              
                            ))
                                FROM azst_product_ingredients 
                                WHERE azst_product_ingredients.product_id = azst_products.id
                                  AND azst_product_ingredients.status = 1
                              ) AS product_ingredients,
                              (
                                SELECT JSON_ARRAYAGG(
                                  JSON_OBJECT(
                                    'feature_id', azst_product_features.id,
                                    'title', azst_product_features.title,
                                    'image',  CONCAT('${
                                      req.protocol
                                    }://${req.get(
    'host'
  )}/api/images/features/', azst_product_features.image)
                                  )
                                )
                                FROM azst_product_features 
                                WHERE azst_product_features.product_id = azst_products.id
                                  AND azst_product_features.status = 1
                              ) AS product_features,
                               CASE 
                      WHEN wl.azst_product_id IS NOT NULL THEN true
                      ELSE false
                    END AS in_wishlist
                            FROM 
                              azst_products
                              LEFT JOIN azst_wishlist_tbl AS wl ON azst_products.id = wl.azst_product_id AND wl.status = 1
                            WHERE 
                              azst_products.product_url_title = ?
                              AND azst_products.status = 1;
                            `;

  const getVariants = `SELECT  id,option1,option2,option3 , variant_quantity FROM  azst_sku_variant_info 
                        WHERE product_id = ? AND status = 1 ORDER BY id`;

  const results = await db(getproductDetails, [productId]);

  if (results.length === 0)
    return res
      .status(200)
      .json({ productDetails: {}, message: 'No product found' });

  const product = results[0];
  const productIdd = product.id;

  const productDetails = {
    ...product,
    image_src: `${req.protocol}://${req.get('host')}/api/images/product/${
      product.image_src
    }`,
    product_images: JSON.parse(product.product_images).map(
      (product_image) =>
        `${req.protocol}://${req.get(
          'host'
        )}/api/images/product/${product_image}`
    ),
  };

  const storeOrder = JSON.parse(product.variant_store_order);

  const result = await db(getVariants, [productIdd]);
  const variantsData = [];
  if (storeOrder) {
    storeOrder.forEach((element) => {
      variantsData.push({ UOM: element, values: [] });
    });
  }

  // Push unique values from result into variantsData
  result.forEach((variant) => {
    for (let i = 0; i < variantsData.length; i++) {
      variantsData[i].values.push(variant[`option${i + 1}`]);
    }
  });

  // Remove duplicate values using set
  variantsData.forEach((variant) => {
    variant.values = Array.from(new Set(variant.values));
    variant.values = variant.values.filter((value) => value !== null);
  });

  res.status(200).json({
    productDetails,
    variants: variantsData,
    avalaibleVariants: result,
    message: 'Data retrieved successfully.',
  });
});

exports.getProductVariant = catchAsync(async (req, res, next) => {
  const { variantId } = req.body;

  if (!variantId) return next(new AppError('Variant Id not provided.', 400));

  const query = `SELECT * FROM azst_sku_variant_info WHERE id = ? AND status = 1`;

  const variantData = await db(query, [variantId]);

  if (variantData.length < 1) {
    return res.status(404).send({
      variant: {},
      message: 'No such variant found',
    });
  }
  const getImageLink = (img) =>
    `${req.protocol}://${req.get(
      'host'
    )}/api/images/product/variantimage/${img}`;

  const variantObj = variantData[0];

  const variant_data = {
    ...variantObj,
    variant_image: JSON.parse(variantObj.variant_image).map((img) =>
      getImageLink(img)
    ),
  };

  res.status(200).json({ variant: variant_data, message: 'Variant Details' });
});

exports.getAllProducts = catchAsync(async (req, res, next) => {
  const getProductsQuery = `
    SELECT 
      p.id AS product_id,
      p.product_title,
      p.product_category,
      p.url_handle,
      p.status,
      p.image_src,
      COALESCE(i.total_variant_quantity, 0) AS total_variant_quantity,
      COUNT(DISTINCT s.id) AS total_variants
    FROM azst_products p
    LEFT JOIN (
      SELECT 
        azst_ipm_product_id,
        SUM(azst_ipm_onhand_quantity) AS total_variant_quantity
      FROM azst_inventory_product_mapping
      GROUP BY azst_ipm_product_id
    ) i ON p.id = i.azst_ipm_product_id
    LEFT JOIN azst_sku_variant_info s ON p.id = s.product_id
    GROUP BY 
      p.id,
      p.product_title,
      p.product_category,
      p.url_handle,
      p.status,
      p.image_src,
      i.total_variant_quantity;
  `;

  let products = await db(getProductsQuery);

  if (products.length === 0) {
    return res.status(200).json({
      products: [],
      collection_data: collectiondata,
      message: 'No products found',
    });
  }

  products = products.map((product) => getProductImageLink(req, product));
  res.status(200).json({
    products,
    message: 'Data retrieved successfully.',
  });
});
