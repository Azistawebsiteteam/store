const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');

const db = require('../../dbconfig');

const catchAsync = require('../../Utils/catchAsync');
const AppError = require('../../Utils/appError');
const {
  getofferPercentage,
  getPricess,
} = require('../../Utils/offerperecentageCal');

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

exports.getProductDetails = catchAsync(async (req, res, next) => {
  const { productId } = req.body;

  const getproductDetails = `
    SELECT azst_products.*,
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'inventory_id', ipm.azst_ipm_inventory_id,
          'product_qty', ipm.azst_ipm_onhand_quantity
        )
      ) AS product_qtys
    FROM azst_products
    LEFT JOIN azst_inventory_product_mapping ipm
      ON ipm.azst_ipm_product_id = azst_products.id
    WHERE azst_products.id = ?
    GROUP BY azst_products.id
  `;

  const productResults = await db(getproductDetails, [productId]);

  if (productResults.length === 0) {
    return res
      .status(404)
      .json({ productDetails: {}, message: 'No product found' });
  }

  const product = productResults[0];

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

  if (productDetails.is_varaints_aval === 0) {
    return res.status(200).json({
      productDetails,
      variants: [],
      availableVariants: [],
      message: 'Data retrieved successfully.',
    });
  }
  req.product = productDetails;
  next();
});

exports.getVariantsDetails = catchAsync(async (req, res, next) => {
  const { productId, inventoryIds } = req.body;
  const product = req.product;

  const invIds =
    inventoryIds && inventoryIds.length > 0
      ? `AND ipm.azst_ipm_inventory_id IN (${inventoryIds
          .map((inv) => `'${inv}'`)
          .join(', ')})`
      : '';

  const getVariants = `
    SELECT svi.*, SUM(ipm.azst_ipm_onhand_quantity) as variant_qty
    FROM azst_sku_variant_info svi
    LEFT JOIN azst_inventory_product_mapping ipm ON ipm.azst_ipm_variant_id = svi.id
    WHERE svi.product_id = ? ${invIds}
    GROUP BY svi.id
  `;

  const variantResults = await db(getVariants, [productId]);

  const storeOrder = JSON.parse(product.variant_store_order || '[]');

  const variantsData = storeOrder.map((element) => ({
    UOM: element,
    values: [],
  }));

  if (variantResults && variantResults.length > 0) {
    variantResults.forEach((variant) => {
      for (let i = 0; i < variantsData.length; i++) {
        if (variant[`option${i + 1}`] !== null) {
          variantsData[i].values.push(variant[`option${i + 1}`]);
        }
      }
    });
  }

  variantsData.forEach((variant) => {
    variant.values = Array.from(new Set(variant.values));
  });

  const availableVariants = variantResults.map((variant) => ({
    ...variant,
    variant_image: variant.variant_image
      ? JSON.parse(variant.variant_image).map(
          (i) =>
            `${req.protocol}://${req.get(
              'host'
            )}/api/images/product/variantimage/${i}`
        )
      : '',
  }));

  res.status(200).json({
    productDetails: product,
    variants: variantsData,
    availableVariants,
    message: 'Data retrieved successfully.',
  });
});

const updateInventory = async (
  inventoryId,
  productId,
  variantId,
  quantity,
  empId
) => {
  const getInventoryQuery = `
    SELECT azst_ipm_onhand_quantity, azst_ipm_avbl_quantity 
    FROM azst_inventory_product_mapping 
    WHERE azst_ipm_inventory_id = ? 
      AND azst_ipm_product_id = ? 
      AND azst_ipm_variant_id = ?;
  `;

  const updateInventoryQuery = `
    UPDATE azst_inventory_product_mapping 
    SET azst_ipm_onhand_quantity = ?, 
        azst_ipm_avbl_quantity = ?, 
        azst_ipm_updated_by = ?
    WHERE azst_ipm_inventory_id = ? 
      AND azst_ipm_product_id = ? 
      AND azst_ipm_variant_id = ?;
  `;

  try {
    const [currentInventory] = await db(getInventoryQuery, [
      inventoryId,
      productId,
      variantId,
    ]);

    if (currentInventory) {
      const { azst_ipm_onhand_quantity, azst_ipm_avbl_quantity } =
        currentInventory;
      const newAvblQuantity =
        quantity - azst_ipm_onhand_quantity + azst_ipm_avbl_quantity;
      const invValues = [
        quantity,
        newAvblQuantity,
        empId,
        inventoryId,
        productId,
        variantId,
      ];
      await db(updateInventoryQuery, invValues);
    } else {
      const query = `INSERT INTO azst_inventory_product_mapping 
                  (azst_ipm_inventory_id, azst_ipm_product_id, azst_ipm_variant_id, 
                   azst_ipm_onhand_quantity, azst_ipm_avbl_quantity, azst_ipm_created_by)
               VALUES (?, ?, ?, ?, ?, ?)`;

      const values = [
        inventoryId,
        productId,
        variantId,
        quantity,
        quantity,
        empId,
      ];
      await db(query, values);
    }
  } catch (error) {
    throw error;
  }
};

const updateTheInventory = async (inventory, productId, empId) => {
  try {
    const inventoryPromises = inventory.map(({ inventoryId, qty }) =>
      updateInventory(inventoryId, productId, 0, qty, empId)
    );
    await Promise.all(inventoryPromises);
  } catch (error) {
    throw error;
  }
};

const updateVariantInventory = async (
  inventory,
  productId,
  variantId,
  quantity,
  empId
) => {
  const inventoryPromises = inventory.map((inventoryId) =>
    updateInventory(inventoryId, productId, variantId, quantity, empId)
  );
  await Promise.all(inventoryPromises);
};

const insertVariantInventory = async (
  vInventoryInfo,
  productId,
  variantId,
  quantity,
  empId
) => {
  const inventoryQuery = `
    INSERT INTO azst_inventory_product_mapping (azst_ipm_inventory_id, azst_ipm_product_id, 
      azst_ipm_variant_id, azst_ipm_onhand_quantity, azst_ipm_avbl_quantity, azst_ipm_created_by) 
    VALUES (?, ?, ?, ?, ?, ?);
  `;

  const inventoryPromises = JSON.parse(vInventoryInfo).map((inventoryId) => {
    const invValues = [
      inventoryId,
      productId,
      variantId,
      quantity,
      quantity,
      empId,
    ];
    return db(inventoryQuery, invValues);
  });

  await Promise.all(inventoryPromises);
};

const newVariantImages = (productImages) => {
  return productImages.map((url) => url.substring(url.lastIndexOf('/') + 1));
};

exports.updateProduct = catchAsync(async (req, res, next) => {
  const {
    productId,
    productMainTitle,
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
    minCartQty,
    maxCartQty,
  } = req.body;

  const newProductImages = productImages.map((url) =>
    url.substring(url.lastIndexOf('/') + 1)
  );

  const parsedVariants = variantsThere ? JSON.parse(variants) : null;
  const firstVariant = parsedVariants ? getPricess(parsedVariants[0]) : null;

  const price = firstVariant ? firstVariant.offer_price : productPrice;
  const comparePrice = firstVariant
    ? firstVariant.comparePrice
    : productComparePrice;
  const urlTitle = productTitle.replace(/ /g, '-');
  const inventory = !variantsThere ? JSON.parse(inventoryInfo) : [];

  const productImage = newProductImages[0];

  const productUpdatequery = `
    UPDATE azst_products 
    SET product_main_title = ? , product_title = ?, product_info = ?, vendor_id = ?, product_category = ?, type = ?, tags = ?, collections = ?, 
        image_src = ?, product_images = ?, variant_store_order = ?, image_alt_text = ?, seo_title = ?, seo_description = ?, 
        cost_per_item = ?, price = ?, compare_at_price = ?, sku_code = ?, sku_bar_code = ?, is_taxable = ?, product_weight = ?, 
        out_of_stock_sale = ?, url_handle = ?, status = ?, azst_updatedby = ?, product_url_title = ?, brand_id = ?, 
        is_varaints_aval = ?,min_cart_quantity = ?,max_cart_quantity = ?
    WHERE id = ?;
  `;

  const values = [
    productMainTitle,
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
    skuCode,
    skuBarcode,
    productIsTaxable,
    productWeight,
    cwos,
    urlHandle,
    productActiveStatus,
    req.empId,
    urlTitle,
    brand,
    variantsThere,
    minCartQty,
    maxCartQty,
    productId,
  ];

  await db(productUpdatequery, values);

  if (!variantsThere) {
    try {
      await updateTheInventory(inventory, productId, req.empId);
      return res.status(200).json({ message: 'Product updated successfully' });
    } catch (error) {
      next(new AppError(error.message, 400));
    }
  }
  next();
});

exports.skuvarientsUpdate = catchAsync(async (req, res, next) => {
  const { productActiveStatus, variants, productId, vInventoryInfo } = req.body;

  const insertProductVariantsQuery = `
    INSERT INTO azst_sku_variant_info (product_id, variant_image, variant_weight_unit, variant_HS_code, variant_barcode,
      variant_sku, variant_weight, variant_inventory_tracker, variant_inventory_policy, variant_fulfillment_service,
      variant_requires_shipping, variant_taxable, compare_at_price, offer_price, offer_percentage, status, variant_quantity,
      option1, option2, option3)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;

  const updateProductVariantsQuery = `
    UPDATE azst_sku_variant_info
    SET product_id = ?, variant_image = ?, variant_weight_unit = ?, variant_HS_code = ?, variant_barcode = ?, variant_sku = ?,
      variant_weight = ?, variant_inventory_tracker = ?, variant_inventory_policy = ?, variant_fulfillment_service = ?,
      variant_requires_shipping = ?, variant_taxable = ?, compare_at_price = ?, offer_price = ?, offer_percentage = ?, 
      status = ?, variant_quantity = ?, option1 = ?, option2 = ?, option3 = ?
    WHERE id = ?;
  `;

  const deleteMainVariantQuery = `DELETE FROM azst_sku_variant_info WHERE id = ?`;

  const insertVariant = async (values, quantity) => {
    const variant = await db(insertProductVariantsQuery, values);
    await insertVariantInventory(
      vInventoryInfo,
      productId,
      variant.insertId,
      quantity,
      req.empId
    );
  };

  const updateVariant = async (values, variantId, quantity) => {
    await db(updateProductVariantsQuery, values);
    const inventory = JSON.parse(vInventoryInfo);
    await updateVariantInventory(
      inventory,
      productId,
      variantId,
      quantity,
      req.empId
    );
  };

  const deleteOldMainVariants = async (id) => {
    await db(deleteMainVariantQuery, [id]);
  };

  const variantsData = JSON.parse(variants);

  for (let variant of variantsData) {
    let mainVariant = variant.main;
    let subvariants = variant.sub;

    if (subvariants.length > 1) {
      await deleteOldMainVariants(mainVariant.variantId);
      mainVariant.variantId = 0;
    }
    if (subvariants.length > 0) {
      const updatedVariants = [];
      for (let subvariant of subvariants) {
        const updateId = updatedVariants.find(
          (v) => v.variantId === subvariant.variantId
        );
        if (parseInt(subvariant.variantId) !== 0) {
          updatedVariants.push(subvariant);
        }
        if (updateId) {
          subvariant.variantId = 0;
        }

        let {
          variantId,
          variantImage,
          variantWeight,
          variantWeightUnit,
          value,
          offer_price,
          comparePrice,
          quantity,
          hsCode,
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

        if (!comparePrice) {
          comparePrice = offer_price;
        }
        const offerPercentage = getofferPercentage(comparePrice, offer_price);
        const values = [
          productId,
          JSON.stringify(
            newVariantImages([mainVariant.variantImage, variantImage])
          ),
          variantWeightUnit,
          hsCode,
          barCode,
          skuCode,
          variantWeight,
          inventoryId,
          inventoryPolicy,
          variantService,
          shippingRequired,
          isTaxable,
          comparePrice,
          offer_price,
          offerPercentage,
          productActiveStatus,
          quantity,
          mainVariant.value,
          option2,
          option3,
        ];

        if (
          subvariants.length > 1 &&
          parseInt(mainVariant.variantId) === 0 &&
          parseInt(variantId) === 0
        ) {
          await insertVariant(values, quantity);
        } else {
          values.push(variantId);
          await updateVariant(values, variantId, quantity);
        }
      }
    } else {
      let {
        variantId,
        variantImage,
        variantWeight,
        variantWeightUnit,
        value,
        comparePrice,
        offer_price,
        quantity,
        hsCode,
        barCode,
        skuCode,
        isTaxable,
        shippingRequired,
        inventoryId,
        inventoryPolicy,
        variantService,
      } = mainVariant;

      if (!comparePrice) {
        comparePrice = offer_price;
      }
      const offerPercentage = getofferPercentage(comparePrice, offer_price);

      const values = [
        productId,
        JSON.stringify(newVariantImages([variantImage])),
        variantWeightUnit,
        hsCode,
        barCode,
        skuCode,
        variantWeight,
        inventoryId,
        inventoryPolicy,
        variantService,
        shippingRequired,
        isTaxable,
        comparePrice,
        offer_price,
        offerPercentage,
        productActiveStatus,
        quantity,
        value,
        null,
        null,
      ];

      if (variantId && parseInt(variantId) !== 0) {
        values.push(variantId);
        await updateVariant(values, variantId, quantity);
      } else {
        await insertVariant(values, quantity);
      }
    }
  }
  res.status(200).json({ message: 'Product & variants inserted successfully' });
});

exports.variantUpdate = catchAsync(async (req, res, next) => {
  const {
    variantId,
    variantWeight,
    variantWeightUnit,
    comparePrice,
    offer_price,
    quantity,
    hsCode,
    barCode,
    skuCode,
    isTaxable,
    shippingRequired,
    inventoryId,
    inventoryPolicy,
    variantService,
    variantImage,
  } = req.body;

  const offerPercentage = getofferPercentage(comparePrice, offer_price);

  let variantImgQuery = 'variant_image =? ,';

  const variantImg = JSON.parse(req.variantData.variant_image)[0];
  const variantImages = JSON.stringify([variantImg, variantImage]);

  const values = [
    variantImages,
    variantWeightUnit,
    hsCode,
    barCode,
    skuCode,
    variantWeight,
    inventoryId,
    inventoryPolicy,
    variantService,
    shippingRequired,
    isTaxable,
    comparePrice,
    offer_price,
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
                  compare_at_price=?, offer_price=?, offer_percentage=?, variant_quantity=?
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
        `${req.protocol}://${req.get(
          'host'
        )}/api/images/product/${product_image}`
    ),
    message: 'Success updating product images',
  });
});
