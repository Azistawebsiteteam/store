const mysql = require('mysql2');
const AppError = require('./Utils/appError');

const db = mysql.createConnection({
  host: process.env.DB_HOSTIP,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectTimeout: 15000,
});

db.connect((err) => {
  if (err) {
    return new AppError('Error connecting to database', 500);
  } else {
    console.log('Connected to MySQL database');
  }
});

module.exports = db;
