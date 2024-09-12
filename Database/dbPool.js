const mysql = require('mysql2'); // Use the promise API

const db = mysql.createPool({
  host: process.env.DB_HOSTIP,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  queueLimit: 0, // Unlimited queueing
  connectionLimit: 10,
  connectTimeout: 15000,
});

module.exports = db;
