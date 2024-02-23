const mysql = require('mysql2');
const util = require('util');

const AppError = require('./Utils/appError');

const db = mysql.createConnection({
  host: process.env.DB_HOSTIP,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  queueLimit: 0, // Unlimited queueing
  connectTimeout: 15000,
});

db.connect((err) => {
  if (err) {
    console.log(err);
    return new AppError('Error connecting to database', 500);
  } else {
    console.log('Connected to MySQL database');
  }
});

const queryAsync = util.promisify(db.query).bind(db);

module.exports = queryAsync;
