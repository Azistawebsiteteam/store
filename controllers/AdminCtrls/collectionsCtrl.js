const Joi = require('joi');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');

const db = require('../../dbconfig');

const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');

exports.isCollectionExist = catchAsync(async (req, res, next) => {
  const { collectionId } = req.body;
  if (!collectionId)
    return next(new AppError('Collection Id is Required', 400));
  const getCollection = `SELECT azst_collection_id,azst_collection_name,azst_collection_content,collection_url_title,
                            azst_collection_seo_tile,azst_collection_seo_content,azst_collection_url,
                            azst_collection_img
                          FROM azst_collections_tbl
                          WHERE azst_collection_id = ${collectionId} AND azst_collection_status = 1`;
  const collection = await db(getCollection);
  if (collection.length === 0)
    return next(new AppError('No collection found', 404));
  req.collection = collection[0];
  next();
});

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(
      new AppError('file is Not an Image! please upload only image', 400),
      false
    );
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadImage = upload.single('collectionImg');

exports.storeImage = catchAsync(async (req, res, next) => {
  if (!req.file) {
    req.body.collectionImg = '';
    return next();
    //next(new AppError('Upload collection image is required', 400));
  }
  const imageName = `${Date.now()}-${req.file.originalname.replace(/ /g, '-')}`;
  await sharp(req.file.buffer).toFile(`Uploads/CollectionImages/${imageName}`);
  req.body.collectionImg = imageName;
  next();
});

exports.updateImage = catchAsync(async (req, res, next) => {
  const { azst_collection_img } = req.collection;
  if (!req.file) {
    req.body.collectionImg = azst_collection_img;
    return next();
  }
  const imagePath = `Uploads/CollectionImages/${azst_collection_img}`;

  fs.unlink(imagePath, (err) => {});

  const imageName = `${Date.now()}-${req.file.originalname.replace(/ /g, '-')}`;
  await sharp(req.file.buffer).toFile(`Uploads/CollectionImages/${imageName}`);
  req.body.collectionImg = imageName;
  next();
});

// azst_collection_img: `${req.protocol}://${req.get('host')}/collection/${
exports.collections = catchAsync(async (req, res, next) => {
  const collectiosrQuer = `SELECT azst_collection_id,azst_collection_name,collection_url_title,
                            azst_collection_img 
                            FROM azst_collections_tbl WHERE azst_collection_status = 1`;
  const collectiosrQuery = `SELECT 
                              azst_collections_tbl.azst_collection_id,
                              azst_collections_tbl.azst_collection_name,
                              azst_collections_tbl.collection_url_title,
                              azst_collections_tbl.azst_collection_img,
                              COUNT(azst_products.id) AS no_products
                            FROM 
                                azst_collections_tbl
                            LEFT JOIN 
                                azst_products 
                            ON 
                                JSON_CONTAINS(azst_products.collections, CONCAT('"', azst_collections_tbl.collection_url_title, '"'))
                            WHERE 
                                azst_collections_tbl.azst_collection_status = 1
                            GROUP BY 
                                azst_collections_tbl.azst_collection_id,
                                azst_collections_tbl.azst_collection_name,
                                azst_collections_tbl.collection_url_title,
                                azst_collections_tbl.azst_collection_img
                            ORDER BY 
                                azst_collections_tbl.azst_collection_name;
                          `;

  let collections = await db(collectiosrQuery);
  collections = collections.map((cl) => ({
    ...cl,
    azst_collection_img: `${req.protocol}://${req.get(
      'host'
    )}/api/images/collection/${cl.azst_collection_img}`,
  }));
  res.status(200).json(collections);
});

exports.getcollection = catchAsync(async (req, res, next) => {
  const cl = req.collection;
  const collection = {
    ...cl,
    azst_collection_img: `${req.protocol}://${req.get(
      'host'
    )}/api/images/collection/${cl.azst_collection_img}`,
  };

  res.status(200).json(collection);
});

const collectionSchema = Joi.object({
  title: Joi.string().min(1).required(),
  content: Joi.string().min(1).required(),
  metaTitle: Joi.string().min(1).required(),
  metaDescription: Joi.string().min(1).required(),
  urlHandle: Joi.string().min(1).required(),
});

exports.Addcollection = catchAsync(async (req, res, next) => {
  const { title, content, metaDetails, collectionImg } = req.body;
  const { metaTitle, metaDescription, urlHandle } = JSON.parse(metaDetails);

  const { error } = collectionSchema.validate({
    title,
    content,
    metaTitle,
    metaDescription,
    urlHandle,
  });
  if (error) return next(new AppError(error.message, 400));

  const imnsertQuery = `INSERT INTO  azst_collections_tbl (azst_collection_name,azst_collection_content,
                        azst_collection_seo_tile,azst_collection_seo_content,azst_collection_url,
                        azst_collection_img,updatedby,collection_url_title) VALUES (?,?,?,?,?,?,?,?)`;

  const urlTitle = title.replace(/ /g, '-');

  const values = [
    title,
    content,
    metaTitle,
    metaDescription,
    urlHandle,
    collectionImg,
    req.empId,
    urlTitle,
  ];

  const result = await db(imnsertQuery, values);
  res.status(200).json({ azst_collection_id: result.insertId });
});

exports.updateCollection = catchAsync(async (req, res, next) => {
  const { title, content, metaDetails, collectionImg, collectionId } = req.body;
  const { metaTitle, metaDescription, urlHandle } = JSON.parse(metaDetails);

  const { error } = collectionSchema.validate({
    title,
    content,
    metaTitle,
    metaDescription,
    urlHandle,
  });

  if (error) return next(new AppError(error.message, 400));

  const updateQuery = `UPDATE azst_collections_tbl SET azst_collection_name = ?,azst_collection_content= ?,
                        azst_collection_seo_tile = ?,azst_collection_seo_content= ?,azst_collection_url= ?,
                        azst_collection_img = ?,updatedby = ? ,collection_url_title = ? WHERE azst_collection_id = ?`;
  const urlTitle = title.replace(/ /g, '-');

  const values = [
    title,
    content,
    metaTitle,
    metaDescription,
    urlHandle,
    collectionImg,
    req.empId,
    urlTitle,
    collectionId,
  ];

  await db(updateQuery, values);
  res.status(200).json({ message: 'Updated collection ' + title });
});

exports.deleteCollection = catchAsync(async (req, res, next) => {
  const { collectionId } = req.body;
  const deletecollection =
    'UPDATE azst_collections_tbl SET azst_collection_status = 0, updatedby=? where azst_collection_id = ? ';
  const values = [req.empId, collectionId];

  await db(deletecollection, values);
  res.status(200).json({ message: 'collection deleted Successfully ' });
});
