const db = require('../../dbconfig');
const AppError = require('../../Utils/appError');

const catchAsync = require('../../Utils/catchAsync');

const getProductImageLink = (req, product) => ({
  ...product,
  image_src: `${req.protocol}://${req.get('host')}/product/images/${
    product.image_src
  }`,
});

exports.getCollectionProducts = catchAsync(async (req, res, next) => {
  const { collectionId } = req.body; // Assuming collectionId is a single value

  const getProducts = `SELECT id as product_id, product_title, image_src,
                       image_alt_text, price, compare_at_price,product_url_title
                       FROM azst_products
                       WHERE collections ->> '$[*]' LIKE CONCAT('%', ?, '%')  AND azst_products.status = 1`;

  const getCollectionData = `SELECT azst_collection_id,azst_collection_name,azst_collection_content,azst_collection_img 
                              FROM azst_collections_tbl where collection_url_title =? `;

  const results = await db(getProducts, [collectionId]);

  let collectiondata = await db(getCollectionData, [collectionId]);

  if (collectiondata.length === 0)
    return res.status(404).json({
      products: [],
      collection_data: {},
      message: 'No Collection found',
    });

  if (results.length === 0)
    return res.status(200).json({
      products: [],
      collection_data: collectiondata,
      message: 'No product found',
    });

  const collection = collectiondata[0];

  collectiondata = {
    ...collection,
    azst_collection_img: `${req.protocol}://${req.get('host')}/collection/${
      collection.azst_collection_img
    }`,
  };

  const products = results.map((product) => getProductImageLink(req, product));
  res.status(404).json({
    products,
    collection_data: collectiondata,
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

  const products = results.map((product) => ({
    ...product,
    image_src: `${req.protocol}://${req.get('host')}/product/images/${
      product.image_src
    }`,
  }));
  res.status(200).json({ products, message: 'Data retrieved successfully.' });
});

exports.getProductDetalis = catchAsync(async (req, res, next) => {
  const { productId } = req.body;

  const getproductDetails = `SELECT * FROM azst_products  
                              WHERE  product_url_title = ? AND azst_products.status = 1`;

  const getVariants = `SELECT  id,option1,option2,option3 FROM  azst_sku_variant_info 
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
    product_images: JSON.parse(product.product_images).map(
      (product_image) =>
        `${req.protocol}://${req.get('host')}/product/images/${product_image}`
    ),
  };

  const storeOrder = JSON.parse(product.variant_store_order);

  const result = await db(getVariants, [productIdd]);
  const variantsData = [];
  storeOrder.forEach((element) => {
    variantsData.push({ UOM: element, values: [] });
  });

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
    `${req.protocol}://${req.get('host')}/product/variantimage/${img}`;

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
              azst_products.id AS product_id,
              product_title,
              product_category,
              url_handle,
              azst_products.status,
              image_src,
              azst_vendor_details.azst_vendor_name,
              chintal_quantity,
              corporate_office_quantity,
              SUM(azst_sku_variant_info.variant_quantity) AS total_variant_quantity,
              COUNT(azst_sku_variant_info.variant_quantity) AS total_variants
          FROM
              azst_products
          LEFT JOIN azst_vendor_details ON azst_products.vendor_id = azst_vendor_details.azst_vendor_id
          LEFT JOIN azst_sku_variant_info ON azst_products.id = azst_sku_variant_info.product_id
          GROUP BY azst_products.id;`;

  let products = await db(getProductsQuery);

  if (products.length === 0)
    return res.status(200).json({
      products: [],
      collection_data: collectiondata,
      message: 'No products found',
    });

  products = products.map((product) => getProductImageLink(req, product));
  res.status(200).json({
    products,
    message: 'Data retrieved successfully.',
  });
});
