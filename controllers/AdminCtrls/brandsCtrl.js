const sharp = require('sharp');
const fs = require('fs');

const db = require('../../Database/dbconfig');
const multerInstance = require('../../Utils/multer');
const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');

exports.isBrandExit = catchAsync(async (req, res, next) => {
  const { brandId } = req.body;
  if (!brandId) return next(new AppError('Brand Id is Required', 400));

  const getbrand = `SELECT azst_brands_id,azst_brand_name,azst_brand_description,azst_brand_logo
                 FROM azst_brands_tbl WHERE  azst_brands_id = ${brandId} AND status = 1`;
  const brand = await db(getbrand);
  if (brand.length === 0) return next(new AppError('No brand found', 404));
  req.brand = brand[0];
  next();
});

exports.uploadImage = multerInstance.single('brandLogo');

exports.storeImage = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Upload brand image is required', 400));
  }

  const imageName = `${Date.now()}-${req.file.originalname.replace(/ /g, '-')}`;
  await sharp(req.file.buffer).toFile(`Uploads/brandlogos/${imageName}`);

  req.body.image = imageName;
  next();
});

exports.updateImage = catchAsync(async (req, res, next) => {
  const { azst_brand_logo } = req.brand;
  if (!req.file) {
    req.body.image = azst_brand_logo;
    return next();
  }
  const imagePath = `Uploads/brandlogos/${azst_brand_logo}`;

  fs.unlink(imagePath, (err) => {});

  const imageName = `${Date.now()}-${req.file.originalname.replace(/ /g, '-')}`;
  await sharp(req.file.buffer).toFile(`Uploads/brandlogos/${imageName}`);
  req.body.image = imageName;
  next();
});

const modifyBrandData = (req, brand) => ({
  ...brand,
  azst_brand_logo: `${req.protocol}://${req.get(
    'host'
  )}/api/images/brand/logs/${brand.azst_brand_logo}`,
});

exports.getbrands = catchAsync(async (req, res, next) => {
  const brandsQuery = `SELECT azst_brands_id,azst_brand_name,azst_brand_logo,COUNT(p.id) AS no_products
                        FROM azst_brands_tbl b
                        LEFT JOIN azst_products p 
                        ON b.azst_brands_id = p.brand_id AND p.status = 1
                        WHERE b.status = 1
                        GROUP BY 
                          b.azst_brands_id,
                          b.azst_brand_name,
                          b.azst_brand_logo
                        ORDER BY 
                          b.azst_brand_name;`;

  const result = await db(brandsQuery);
  const brands = result.map((brand) => modifyBrandData(req, brand));
  res.status(200).json(brands);
});

exports.getbrand = catchAsync(async (req, res, next) => {
  const brand = modifyBrandData(req, req.brand);
  res.status(200).json(brand);
});

exports.addBrnad = catchAsync(async (req, res, next) => {
  const { brandName, image, description = '' } = req.body;

  if (!brandName) return next(new AppError('Brand Name Required', 400));

  const imnsertQuery =
    'INSERT INTO  azst_brands_tbl (azst_brand_name,azst_brand_logo,azst_brand_description,updatedby) VALUES (?,?,?,?)';

  const values = [brandName, image, description, req.empId];

  const result = await db(imnsertQuery, values);
  res.status(200).json({
    azst_brands_id: result.insertId,
    message: 'Brands added successfully',
  });
});

exports.updateBrand = catchAsync(async (req, res, next) => {
  const { brandId, brandName, image, description } = req.body;

  if (!brandName) {
    return next(new AppError('Brand Name Required', 400));
  }

  const updateQuery = `UPDATE azst_brands_tbl 
    SET azst_brand_name =?, azst_brand_logo =?, azst_brand_description =?, updatedby =? 
    WHERE azst_brands_id =? `;

  const values = [brandName, image, description, req.empId, brandId];

  await db(updateQuery, values);
  res.status(200).json({ message: `Updated brand ${brandName}` });
});

exports.deleteBrand = catchAsync(async (req, res, next) => {
  const { brandId } = req.body;
  const deletecollection =
    'UPDATE azst_brands_tbl SET status = 0, updatedby=? where azst_brands_id = ? ';
  const values = [req.empId, brandId];

  await db(deletecollection, values);
  res.status(200).json({ message: 'brand deleted Successfully ' });
});
