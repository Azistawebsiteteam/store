const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const db = require('../../Database/dbconfig');

const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');

// Multer configuration
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(
      new AppError('File is not an image! Please upload only images.', 400),
      false
    );
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

// Middleware for uploading an image
exports.uploadImage = upload.single('categoryImg');

// Middleware for storing a new image
exports.storeImage = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Upload of category image is required', 400));
  }

  const imageName = `${Date.now()}-${req.file.originalname.replace(/ /g, '-')}`;
  await sharp(req.file.buffer).toFile(`Uploads/categoryImages/${imageName}`);
  req.body.categoryImg = imageName;
  next();
});

// Middleware for updating an existing image
exports.updateImage = catchAsync(async (req, res, next) => {
  const { azst_category_img } = req.category;

  if (!req.file) {
    req.body.categoryImg = azst_category_img;
    return next();
  }

  if (azst_category_img) {
    const imagePath = `Uploads/categoryImages/${azst_category_img}`;
    fs.unlink(imagePath, (err) => {
      if (err) console.error(`Error deleting image: ${err.message}`);
    });
  }

  const imageName = `${Date.now()}-${req.file.originalname.replace(/ /g, '-')}`;
  await sharp(req.file.buffer).toFile(`Uploads/categoryImages/${imageName}`);
  req.body.categoryImg = imageName;
  next();
});

// Middleware to check if a category exists
exports.isCategoryExist = catchAsync(async (req, res, next) => {
  const { categoryId } = req.body;

  if (!categoryId) return next(new AppError('Category ID is required', 400));

  const query = `SELECT azst_category_id, azst_category_img FROM azst_category_tbl
                 WHERE azst_category_id = ? AND azst_category_status = 1`;

  const [category] = await db(query, [categoryId]);

  if (!category) return next(new AppError('No category found', 404));

  req.category = category;
  next();
});

// Helper function to generate image link
const categoryImgLink = (req, img) =>
  `${req.protocol}://${req.get('host')}/api/images/category/${img}`;

// Get all categories with product count
exports.getCategories = catchAsync(async (req, res, next) => {
  const query = `
    SELECT 
      c.azst_category_id,
      c.azst_category_name,
      c.azst_category_img,
      COUNT(p.id) AS no_products
    FROM 
      azst_category_tbl c
    LEFT JOIN 
      azst_products p 
    ON 
      c.azst_category_id = p.product_category
    WHERE 
      c.azst_category_status = 1
    GROUP BY 
      c.azst_category_id,
      c.azst_category_name,
      c.azst_category_img
    ORDER BY 
      c.azst_category_name;
  `;

  const result = await db(query);

  const categories = result.map((category) => ({
    ...category,
    azst_category_img: categoryImgLink(req, category.azst_category_img),
  }));

  res.status(200).json(categories);
});

// Get subcategories by category ID
exports.getSubcategories = catchAsync(async (req, res, next) => {
  const { categoryId } = req.body;

  const query = `
    SELECT azst_sub_category_id, azst_sub_category_name 
    FROM azst_sub_category_tbl
    WHERE azst_sub_category_status = 1 AND azst_category_id = ?`;

  const subcategories = await db(query, [categoryId]);

  res.status(200).json(subcategories);
});

// Get a specific category with its subcategories
exports.getCategory = catchAsync(async (req, res, next) => {
  const { categoryId } = req.body;

  const query = `
    SELECT 
      c.azst_category_id,
      c.azst_category_name,
      c.azst_category_img,
      c.azst_category_description,
      JSON_ARRAYAGG(
        JSON_OBJECT(
          'azst_sub_category_id', s.azst_sub_category_id,
          'azst_sub_category_name', s.azst_sub_category_name
        )
      ) AS azst_subCategories
    FROM 
      azst_category_tbl c
    LEFT JOIN 
      azst_sub_category_tbl s
    ON 
      c.azst_category_id = s.azst_category_id
    WHERE 
      c.azst_category_id = ? 
      AND c.azst_category_status = 1
      AND (s.azst_sub_category_status = 1 OR s.azst_sub_category_status IS NULL)
    GROUP BY
      c.azst_category_id;
  `;

  const [category] = await db(query, [categoryId]);

  if (!category) {
    return next(new AppError('Category not found', 404));
  }

  const categories = {
    ...category,
    azst_category_img: categoryImgLink(req, category.azst_category_img),
  };

  res.status(200).json(categories);
});

// Get a specific subcategory by ID
exports.getSubCategory = catchAsync(async (req, res, next) => {
  const { subCategoryId } = req.body;

  const query = `
    SELECT azst_sub_category_id, azst_sub_category_name, azst_category_id
    FROM azst_sub_category_tbl
    WHERE azst_sub_category_id = ? AND azst_sub_category_status = 1`;

  const [subcategory] = await db(query, [subCategoryId]);

  if (!subcategory) {
    return next(new AppError('Subcategory not found', 404));
  }

  res.status(200).json(subcategory);
});

// Add a new category
exports.addCategory = catchAsync(async (req, res, next) => {
  const { categoryName, categoryImg, description } = req.body;

  const query = `
    INSERT INTO azst_category_tbl (azst_category_name, azst_category_img, azst_category_description, azst_updated_by)
    VALUES (?, ?, ?, ?)`;

  const values = [categoryName, categoryImg, description, req.empId];

  const result = await db(query, values);

  if (result.affectedRows > 0) {
    req.body.categoryId = result.insertId;
    return next();
  }

  res.status(400).json({ message: 'Something went wrong' });
});

// Helper function to add a new subcategory
const addSubCategory = async (values) => {
  const query = `
    INSERT INTO azst_sub_category_tbl (azst_sub_category_name, azst_category_id, updated_by)
    VALUES (?, ?, ?)`;
  await db(query, values);
};

// Helper function to update an existing subcategory
const updateSubCategory = async (subCategory, empId) => {
  const { subCategoryName, id } = subCategory;

  const query = `
    UPDATE azst_sub_category_tbl 
    SET azst_sub_category_name = ?, updated_by = ? 
    WHERE azst_sub_category_id = ?`;

  const values = [subCategoryName, empId, id];

  await db(query, values);
};

// Add or update subcategories
exports.addSubCategory = catchAsync(async (req, res, next) => {
  const { subCategories, categoryId } = req.body;

  const subCategoriesArray = JSON.parse(subCategories);

  for (const subCategory of subCategoriesArray) {
    const { subCategoryName, id } = subCategory;

    if (typeof id === 'string') {
      await addSubCategory([subCategoryName, categoryId, req.empId]);
    } else {
      await updateSubCategory(subCategory, req.empId);
    }
  }

  res.status(200).json({ azst_category_id: categoryId });
});

// Helper function to delete a subcategory
const deleteSubCategory = async (subCategoryId, empId) => {
  const query = `
    UPDATE azst_sub_category_tbl 
    SET azst_sub_category_status = 0, updated_by = ? 
    WHERE azst_sub_category_id = ?`;

  await db(query, [empId, subCategoryId]);
};

// Update a category and its subcategories
exports.updateCategory = catchAsync(async (req, res, next) => {
  const { categoryId, categoryName, categoryImg, description, deletedSubCats } =
    req.body;

  const deleteSubCatsArray = JSON.parse(deletedSubCats);
  for (const subCategoryId of deleteSubCatsArray) {
    await deleteSubCategory(subCategoryId, req.empId);
  }

  const query = `
    UPDATE azst_category_tbl 
    SET azst_category_name = ?, azst_category_img = ?, azst_category_description = ?, azst_updated_by = ?
    WHERE azst_category_id = ?`;

  const values = [
    categoryName,
    categoryImg,
    description,
    req.empId,
    categoryId,
  ];

  await db(query, values);

  next();
});

// Delete a category
exports.deleteCategory = catchAsync(async (req, res, next) => {
  const { categoryId } = req.body;

  const query = `
    UPDATE azst_category_tbl 
    SET azst_category_status = 0, azst_updated_by = ? 
    WHERE azst_category_id = ?`;

  const values = [req.empId, categoryId];

  await db(query, values);

  res.status(200).json({ message: 'Category deleted successfully' });
});
