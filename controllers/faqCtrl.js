const db = require('../dbconfig');
const AppError = require('../Utils/appError');

const catchAsync = require('../Utils/catchAsync');

exports.getFaqs = catchAsync(async (req, res, next) => {
  const query = `SELECT azst_faq_id,azst_faq_question,azst_faq_ans,azst_faq_type
                     FROM azst_faq_tbl WHERE azst_faq_status = 1
                     ORDER BY azst_faq_type ,azst_faq_updated_on DESC `;

  const faqs = await db(query);

  // if customer requested data unique blog types is reauired
  if (req.path === '/customer') {
    const faqTypes = Array.from(new Set(faqs.map((faq) => faq.azst_faq_type)));
    return res.status(200).json({ faqTypes, faqs });
  }

  res.status(200).json(faqs);
});

exports.getProductFaq = catchAsync(async (req, res, next) => {
  const { productId } = req.body;

  if (!productId) return next(new AppError('Product id Required', 404));

  const query = `SELECT azst_faq_question,azst_faq_ans
                  FROM azst_faq_tbl
                  WHERE azst_faq_status = 1 AND azst_faq_type = 'product' AND azst_faq_product_id = ?
                  ORDER BY azst_faq_type ,azst_faq_updated_on DESC `;

  const faqs = await db(query, [productId]);

  res.status(200).json(faqs);
});

exports.createFaq = catchAsync(async (req, res, next) => {
  const { question, answer, type } = req.body;

  const query = `INSERT INTO azst_faq_tbl (  azst_faq_question,
                    azst_faq_ans,
                    azst_faq_type,azst_faq_created_by) VALUES(?,?,?,?) `;
  const values = [question, answer, type, req.empId];

  const result = await db(query, values);

  if (result.affectedRows > 0)
    return res
      .status(201)
      .json({ azst_faq_id: result.insertId, message: 'Successfully inserted' });

  next(new AppError('oops something went wrong', 400));
});

exports.isExist = catchAsync(async (req, res, next) => {
  const { id } = req.body;

  if (!id) return next(new AppError('faqId is Required', 400));

  const query = `SELECT azst_faq_id,azst_faq_question,azst_faq_ans,azst_faq_type
                    FROM azst_faq_tbl
                    WHERE  azst_faq_id = ? AND  azst_faq_status = 1 `;
  const faqs = await db(query, [id]);
  if (faqs.length === 0)
    return next(new AppError('No faqs found with id ', 404));
  res.faq = faqs[0];
  next();
});

exports.getFaq = catchAsync(async (req, res, next) => {
  const faq = res.faq;
  res.status(200).json(faq);
});

exports.updateFaq = catchAsync(async (req, res, next) => {
  const { question, answer, type, id } = req.body;

  const query = `UPDATE azst_faq_tbl 
                    SET  azst_faq_question = ?, azst_faq_ans =? , azst_faq_type = ? , azst_faq_updated_by = ?
                    WHERE  azst_faq_id = ?`;

  const values = [question, answer, type, req.empId, id];

  const result = await db(query, values);

  if (result.affectedRows > 0)
    return res.status(201).json({ message: 'Successfully updated' });

  next(new AppError('oops something went wrong', 400));
});

exports.deleteFaq = catchAsync(async (req, res, next) => {
  const { id } = req.body;

  const query = `UPDATE azst_faq_tbl 
                    SET  azst_faq_status = 0
                    WHERE  azst_faq_id = ?`;

  const result = await db(query, [id]);

  if (result.affectedRows > 0)
    return res.status(201).json({ message: 'Successfully Deleted' });

  next(new AppError('oops something went wrong', 400));
});

// azst_faq_tbl;
// azst_faq_id,
//   azst_faq_question,
//   azst_faq_ans,
//   azst_faq_type,
//   azst_faq_created_on,
//   azst_faq_created_by,
//   azst_faq_updated_on,
//   azst_faq_updated_by,
//   azst_faq_status;
