const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');

const db = require('../../dbconfig');

const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('File is not an image! Please upload only images.'), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.updateVariantImage = upload.single('variantImage');

exports.isVariantExist = catchAsync(async (req, res, next) => {
  const { variantId } = req.body;

  if (!variantId) return next(new AppError('Variant Id not provided.', 400));

  const query = `SELECT id,variant_image FROM azst_sku_variant_info WHERE id = ? AND status = 1`;

  const variantData = await db(query, [variantId]);

  if (variantData.length < 1)
    return next(new AppError('No such variant found', 404));
  req.variantData = variantData[0];
  next();
});

exports.updateImage = catchAsync(async (req, res, next) => {
  if (!req.file) {
    req.body.variantImage = '';
    return next();
  }

  const variantImg = JSON.parse(req.variantData.variant_image)[1];

  const imagePath = `uploads/variantImage/${variantImg}`;
  fs.unlink(imagePath, (err) => {});

  const imageName = `${Date.now()}-${req.file.originalname.replace(/ /g, '-')}`;

  await sharp(req.file.buffer)
    .toFormat('jpeg')
    .jpeg({ quality: 100 })
    .toFile(`uploads/variantImage/${imageName}`);
  req.body.variantImage = imageName;
  next();
});

const getProductImageLink = (req, i) =>
  `${req.protocol}://${req.get('host')}/product/variantimage/${i}`;

exports.getProductDetalis = catchAsync(async (req, res, next) => {
  const { productId } = req.body;

  const getproductDetails = `SELECT * FROM azst_products  WHERE id = ? `;

  const getVariants = `SELECT  * FROM  azst_sku_variant_info WHERE product_id = ? `;

  const results = await db(getproductDetails, [productId]);

  if (results.length === 0)
    return res
      .status(404)
      .json({ productDetails: {}, message: 'No product found' });

  const product = results[0];
  const productIdd = product.id;

  const productDetails = {
    ...product,
    image_src: `${req.protocol}://${req.get('host')}/product/images/${
      product.image_src
    }`,
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

  const avalaibleVariants = result.map((variant) => ({
    ...variant,
    variant_image: variant.variant_image
      ? JSON.parse(variant.variant_image).map((i) =>
          getProductImageLink(req, i)
        )
      : '',
  }));

  res.status(200).json({
    productDetails,
    variants: variantsData,
    avalaibleVariants,
    message: 'Data retrieved successfully.',
  });
});

exports.updateProduct = catchAsync(async (req, res, next) => {
  const {
    productId,
    productTitle,
    productInfo,
    variantsOrder,
    productPrice,
    productComparePrice,
    productIsTaxable,
    productCostPerItem,
    inventoryInfo,
    vendor,
    cwos,
    skuCode,
    skuBarcode,
    productWeight,
    originCountry,
    productActiveStatus,
    category,
    productType,
    collections,
    tags,
    metaTitle,
    metaDescription,
    urlHandle,
    productImages,
    variantsThere,
    variants,
    brand,
  } = req.body;

  const newProductImages = productImages.map((url) => {
    const startIndex = url.lastIndexOf('/') + 1; // Find the last '/' to get the start index of the filename
    return url.substring(startIndex); // Extract the filename from the URL
  });

  const price = variantsThere
    ? productPrice
    : JSON.parse(variants)[0].main.amount;
  const comparePrice = variantsThere
    ? productComparePrice
    : JSON.parse(variants)[0].main.amount.split('-')[1];

  const url_title = productTitle.replace(/ /g, '-');

  const productImage = newProductImages[0];

  const { coc, coh, inventoryIds } = JSON.parse(inventoryInfo);

  const productUpdatequery = `UPDATE azst_products 
                             SET product_title = ?,product_info = ?,vendor_id = ?,product_category = ?,
                              type = ?,tags = ?,collections = ?,image_src = ?,product_images = ?,
                              variant_store_order = ?,image_alt_text = ?,seo_title = ?,seo_description = ?,
                              cost_per_item = ?,price = ?,compare_at_price = ?,inventory_id = ?,sku_code = ?,
                              sku_bar_code = ?,is_taxable = ?,product_weight = ?,out_of_stock_sale = ?,
                              url_handle = ?,status = ?,azst_updatedby = ?,origin_country = ?,
                              product_url_title = ?,chintal_quantity = ?,corporate_office_quantity = ? , brand_id = ?
                            WHERE id = ?;
                            `;

  const values = [
    productTitle,
    productInfo,
    vendor,
    category,
    productType,
    tags,
    collections,
    productImage,
    JSON.stringify(newProductImages),
    variantsOrder,
    productImage.split('-')[1],
    metaTitle,
    metaDescription,
    productCostPerItem,
    price,
    comparePrice,
    JSON.stringify(inventoryIds),
    skuCode,
    skuBarcode,
    productIsTaxable,
    productWeight,
    cwos,
    urlHandle,
    productActiveStatus,
    req.empId,
    originCountry,
    url_title,
    coc,
    coh,
    brand,
    productId,
  ];

  const result = await db(productUpdatequery, values);

  res.status(200).json({
    message: 'Product updated successfully',
  });
  // if (!variantsThere) {
  //   res.status(200).json({
  //     message: 'Product updated successfully',
  //   });
  //   return;
  // }
  // next();
});

exports.skuvarientsUpdate = catchAsync(async (req, res, next) => {
  const { productId, body } = req;
  const { productActiveStatus, variants } = body;

  const insert_product_varients = `INSERT INTO azst_sku_variant_info (product_id,
    variant_image,
    variant_weight_unit,
    variant_HS_code,
    variant_barcode,
    variant_sku,
    variant_weight,
    variant_inventory_tracker,
    variant_inventory_policy,
    variant_fulfillment_service,
    variant_requires_shipping,
    variant_taxable,
    actual_price,
    offer_price,
    offer_percentage,
    status,
    variant_quantity,
    option1,
    option2,
    option3)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const insertVariant = async (values) => {
    await db(insert_product_varients, values);
  };

  const variantsData = JSON.parse(variants);

  for (let variant of variantsData) {
    let mainVariant = variant.main;
    let subvariants = variant.sub;

    if (subvariants.length > 0) {
      for (let subvariant of subvariants) {
        const {
          variantImage,
          variantWeight,
          variantWeightUnit,
          value,
          amount,
          offerPrice,
          quantity,
          shCode,
          barCode,
          skuCode,
          isTaxable,
          shippingRequired,
          inventoryId,
          inventoryPolicy,
          variantService,
        } = subvariant;

        const subValues = value.split('-');
        const option2 = subValues[0];
        const option3 = subValues.length > 1 ? subValues[1] : null;

        const offerPercentage = Math.round(
          ((parseInt(amount) - parseInt(offerPrice ?? 0)) / parseInt(amount)) *
            100,
          0
        );

        const values = [
          productId,
          JSON.stringify([mainVariant.variantImage, variantImage]),
          variantWeightUnit,
          shCode,
          barCode,
          skuCode,
          variantWeight,
          inventoryId,
          inventoryPolicy,
          variantService,
          shippingRequired,
          isTaxable,
          amount,
          offerPrice,
          offerPercentage,
          productActiveStatus,
          quantity,
          mainVariant.value,
          option2,
          option3,
        ];
        await insertVariant(values);
      }
    } else {
      const {
        variantImage,
        variantWeight,
        variantWeightUnit,
        value,
        amount,
        offerPrice,
        quantity,
        shCode,
        barCode,
        skuCode,
        isTaxable,
        shippingRequired,
        inventoryId,
        inventoryPolicy,
        variantService,
      } = mainVariant;

      const offerPercentage = Math.round(
        ((parseInt(amount) - parseInt(offerPrice || 0)) / parseInt(amount)) *
          100,
        0
      );

      const values = [
        productId,
        variantImage,
        variantWeightUnit,
        shCode,
        barCode,
        skuCode,
        variantWeight,
        inventoryId,
        inventoryPolicy,
        variantService,
        shippingRequired,
        isTaxable,
        amount,
        offerPrice,
        offerPercentage,
        productActiveStatus,
        quantity,
        value,
        null,
        null,
      ];
      await insertVariant(values);
    }
  }
  res.status(200).json({ message: 'Product & variants inserted successfully' });
});

exports.variantUpdate = catchAsync(async (req, res, next) => {
  const {
    variantId,
    variantWeight,
    variantWeightUnit,
    amount,
    offerPrice,
    quantity,
    shCode,
    barCode,
    skuCode,
    isTaxable,
    shippingRequired,
    inventoryId,
    inventoryPolicy,
    variantService,
    variantImage,
  } = req.body;

  const offerPercentage = Math.round(
    ((parseInt(amount) - parseInt(offerPrice || 0)) / parseInt(amount)) * 100,
    0
  );

  let variantImgQuery = 'variant_image =? ,';

  const variantImg = JSON.parse(req.variantData.variant_image)[0];
  const variantImages = JSON.stringify([variantImg, variantImage]);

  const values = [
    variantImages,
    variantWeightUnit,
    shCode,
    barCode,
    skuCode,
    variantWeight,
    inventoryId,
    inventoryPolicy,
    variantService,
    shippingRequired,
    isTaxable,
    amount,
    offerPrice,
    offerPercentage,
    quantity,
    variantId,
  ];

  if (variantImage === '') {
    variantImgQuery = '';
    values.shift();
  }

  const query = `UPDATE azst_sku_variant_info 
                 SET ${variantImgQuery} variant_weight_unit =?, variant_HS_code =?, variant_barcode =?,
                  variant_sku =?, variant_weight=?, variant_inventory_tracker=?, variant_inventory_policy=?,
                  variant_fulfillment_service=?, variant_requires_shipping=?, variant_taxable=?,
                  actual_price=?, offer_price=?, offer_percentage=?, variant_quantity=?
                 WHERE id = ? `;
  await db(query, values);

  res.status(200).json({ message: 'Variant data updated successfully' });
});

exports.deleteVariant = catchAsync(async (req, res, next) => {
  const { variantId } = req.body;
  const query = `Update azst_sku_variant_info SET status = 0 WHERE id = ?`;
  await db(query, [variantId]);
  res.status(200).json({ message: 'Variant data Deleted successfully' });
});

exports.deleteProductImages = catchAsync(async (req, res, next) => {
  const { productId, deleteImgs } = req.body;

  const query =
    'SELECT product_images, image_src FROM azst_products WHERE id = ?';
  const result = await db(query, [productId]);

  if (!result || !result.length) {
    return res.status(404).send({ message: 'Product not found' });
  }

  const productImages = JSON.parse(result[0].product_images);
  const mainImage = result[0].image_src;
  // // Filter pImages to remove elements that match any element in oldImages
  // const filteredImages = pImages.filter((image) => {
  //   // Check if image includes any element from deleteImage
  //   return !deleteImgs.some((dleteImage) => image.includes(deleteImage));
  // });

  // Filter pImages to exclude elements at specified indexes

  const filteredImages = productImages.filter((image, index) => {
    if (deleteImgs.includes(index)) {
      if (image === mainImage) return false; // Do not delete main image
      const imagePath = `uploads/productImages/${image}`;
      // Asynchronously delete the image
      fs.unlink(imagePath, (err) => {});
      return false; // Exclude this image from filteredImages
    } else {
      return true; // Include this image in filteredImages
    }
  });

  const updateQuery =
    'UPDATE azst_products SET product_images = ? WHERE id = ?';
  await db(updateQuery, [JSON.stringify(filteredImages), productId]);

  res.status(200).send({
    updatedImgs: filteredImages.map(
      (product_image) =>
        `${req.protocol}://${req.get('host')}/product/images/${product_image}`
    ),
    message: 'Success updating product images',
  });
});
