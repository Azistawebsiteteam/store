const db = require('../../dbconfig');
const AppError = require('../../Utils/appError');

const catchAsync = require('../../Utils/catchAsync');

const getProductImageLink = (req, product) => ({
  ...product,
  image_src: `${req.protocol}://${req.get('host')}/api/images/product/${
    product.image_src
  }`,
});

//,azst_collection_img  AS azst_collection_img

exports.getCollectionProducts = catchAsync(async (req, res, next) => {
  const { collectionId, categoryId, brandId } = req.body;

  const filters = [];
  const values = [];

  if (collectionId) {
    filters.push(`collections ->> '$[*]' LIKE CONCAT('%', ?, '%')`);
    values.push(collectionId);
  }
  if (categoryId) {
    filters.push(`product_category = ?`);
    values.push(categoryId);
  }
  if (brandId) {
    filters.push(`brand_id = ?`);
    values.push(brandId);
  }

  const filterQuery = `WHERE status = 1 AND ${filters.join(' OR ')}`;

  const getProducts = `SELECT id as product_id, product_title, image_src,
                        image_alt_text, price, compare_at_price, product_url_title
                       FROM azst_products ${filterQuery}`;

  let collectionQuery = '';
  let filtValue = '';

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
                       FROM azst_collections_tbl WHERE collection_url_title = ?`;
    filtValue = collectionId;
  }

  const results = await db(getProducts, values);

  let collectiondata = await db(collectionQuery, [filtValue]);

  const collection = collectiondata.length > 0 ? collectiondata[0] : {};

  const products = results.map((product) => getProductImageLink(req, product));
  res.status(200).json({
    products,
    collection_data: collection,
    message: 'Data retrieved successfully.',
  });
});

exports.getProductsSerach = catchAsync(async (req, res, next) => {
  const { searchText } = req.body;
  if (searchText === '') {
    res.status(200).json({ products: [], message: 'No product found' });
    return;
  }

  const getProducts = `SELECT product_title,image_src,price,product_url_title
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

exports.shop99Products = catchAsync(async (req, res, next) => {
  const getProducts = `SELECT id as product_id, product_title, image_src,
                        image_alt_text, price, compare_at_price, product_url_title
                       FROM azst_products
                       WHERE status = 1 AND collections ->> '$[*]' LIKE CONCAT('%', 'shop@99', '%')`;

  const results = await db(getProducts);
  const products = results.map((product) => getProductImageLink(req, product));

  res.status(200).json(products);
});

exports.getBestSeller = catchAsync(async (req, res, next) => {
  const query = `SELECT id as product_id, product_title, image_src,
                    image_alt_text, price, compare_at_price, product_url_title,
                    COUNT(azst_ordersummary_tbl.azst_order_product_id) AS no_of_orders
                 FROM azst_ordersummary_tbl
                 LEFT JOIN azst_products ON azst_products.id = azst_ordersummary_tbl.azst_order_product_id
                 WHERE  azst_products.status = 1
                 GROUP BY azst_ordersummary_tbl.azst_order_product_id
                 ORDER BY  no_of_orders DESC
                 Limit 8
                 `;

  const results = await db(query);
  const products = results.map((product) => getProductImageLink(req, product));
  res.status(200).json(products);
});

exports.getProductDetalis = catchAsync(async (req, res, next) => {
  const { productId } = req.body;

  const getproductDetails = `SELECT * FROM azst_products  
                              WHERE  product_url_title = ? AND azst_products.status = 1`;

  const getVariants = `SELECT  id,option1,option2,option3 , variant_quantity FROM  azst_sku_variant_info 
                        WHERE product_id = ? AND status = 1 ORDER BY id`;

  const results = await db(getproductDetails, [productId]);

  if (results.length === 0)
    return res
      .status(200)
      .json({ productDetails: {}, message: 'No product found' });

  const product = results[0];
  const productIdd = product.id;

  const productDetails = getProductImageLink(req, product);
  // {
  //   ...product,
  //   product_images: JSON.parse(product.product_images).map(
  //     (product_image) =>
  //       `${req.protocol}://${req.get(
  //         'host'
  //       )}/api/images/product/${product_image}`
  //   ),
  // };

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
    res.status(404).send({
      variant: {},
      message: 'No such variant found',
    });
    return;
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
