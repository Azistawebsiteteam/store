const db = require('../../dbconfig');
const moment = require('moment');

const AppError = require('../../Utils/appError');
const catchAsync = require('../../Utils/catchAsync');

// exports.getEligibleDisscounts = catchAsync(async (req, res, next) => {
//   const date = moment().format('YYYY-MM-DD HH:mm:ss');
//   const query = `SELECT  azst_dsc_id ,
//                     azst_dsc_title ,
//                     azst_dsc_code ,
//                     azst_dsc_mode ,
//                     azst_dsc_value ,
//                     azst_dsc_apply_mode ,
//                     azst_dsc_apply_id ,
//                     azst_dsc_prc_value ,
//                     azst_dsc_apply_qty ,
//                     azst_dsc_usage_cnt,
//                    count(azst_cus_dsc_mapping_tbl.azst_cdm_dsc_id)  as discount_used
//                 FROM  azst_discount_tbl
//                 LEFT   JOIN azst_cus_dsc_mapping_tbl ON azst_cus_dsc_mapping_tbl.azst_cdm_dsc_id = azst_discount_tbl.azst_dsc_id
//                 AND  azst_cus_dsc_mapping_tbl.azst_cdm_cus_id = ?
//                 WHERE azst_dsc_elg_cus ->> '$[*]' LIKE CONCAT('%', ?, '%')  AND azst_dsc_status = 1 AND
//                   '${date}' >= azst_dsc_start_tm AND '${date}' <= azst_dsc_end_tm
//                 GROUP BY azst_cus_dsc_mapping_tbl.azst_cdm_dsc_id`;

//   // azst_dsc_start_tm,
//   // azst_dsc_end_tm,

//   console.log(req.empId, 'empid');
//   const id = req.empId;
//   const result = await db(query, [id, id]);

//   res.status(200).json(result);
// });

exports.getEligibleDiscounts = catchAsync(async (req, res, next) => {
  const date = moment().format('YYYY-MM-DD HH:mm:ss');

  const query = `
    SELECT
      azst_discount_tbl.azst_dsc_id,
      azst_discount_tbl.azst_dsc_title,
      azst_discount_tbl.azst_dsc_code,
      azst_discount_tbl.azst_dsc_mode,
      azst_discount_tbl.azst_dsc_value,
      azst_discount_tbl.azst_dsc_apply_mode,
      azst_discount_tbl.azst_dsc_apply_id,
      azst_discount_tbl.azst_dsc_prc_value,
      azst_discount_tbl.azst_dsc_apply_qty,
      azst_discount_tbl.azst_dsc_usage_cnt,
      COUNT(azst_cus_dsc_mapping_tbl.azst_cdm_dsc_id) AS discount_used
    FROM
      azst_discount_tbl
    LEFT JOIN
      azst_cus_dsc_mapping_tbl
    ON
      azst_cus_dsc_mapping_tbl.azst_cdm_dsc_id = azst_discount_tbl.azst_dsc_id
      AND azst_cus_dsc_mapping_tbl.azst_cdm_cus_id = ?
    WHERE
      (azst_dsc_elg_cus = 'all' OR JSON_CONTAINS(azst_dsc_elg_cus, JSON_ARRAY(?)))
      AND azst_dsc_status = 1 
      AND ? BETWEEN azst_dsc_start_tm AND azst_dsc_end_tm
    GROUP BY
      azst_discount_tbl.azst_dsc_id,
      azst_discount_tbl.azst_dsc_title,
      azst_discount_tbl.azst_dsc_code,
      azst_discount_tbl.azst_dsc_mode,
      azst_discount_tbl.azst_dsc_value,
      azst_discount_tbl.azst_dsc_apply_mode,
      azst_discount_tbl.azst_dsc_apply_id,
      azst_discount_tbl.azst_dsc_prc_value,
      azst_discount_tbl.azst_dsc_apply_qty,
      azst_discount_tbl.azst_dsc_usage_cnt
    HAVING
      discount_used < azst_dsc_usage_cnt;
  `;

  const id = req.empId;

  const result = await db(query, [id, id, date]);
  res.status(200).json(result);
});
