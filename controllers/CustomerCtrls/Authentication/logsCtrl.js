const db = require('../../../dbconfig');
const moment = require('moment');

const enterLoginLogs = (customerId, token) => {
  const insertQuery = `INSERT INTO azst_customer_login_logs 
                      (azst_customer_login_logs_customer_id, azst_customer_login_logs_logintime,
                      azst_customer_login_logs_sessionid, azst_customer_login_logs_status,
                      azst_customer_login_logs_createdon)
                      VALUES (?, ?, ?, ?, ?)`;

  const today = moment().format('YYYY-MM-DD HH:mm:ss');
  const values = [customerId, today, token, 'started', today];

  db.query(insertQuery, values, (err, result) => {});
};

module.exports = enterLoginLogs;
