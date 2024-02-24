const mysql = require('mysql2');
const util = require('util');
const AppError = require('./Utils/appError');

const db = mysql.createPool({
  host: process.env.DB_HOSTIP,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  queueLimit: 0, // Unlimited queueing
  connectTimeout: 15000,
});

// Function to establish database connection
const connectToDatabase = () => {
  db.getConnection((error, connection) => {
    if (error) {
      // console.error('Error connecting to the database:', error.message);
      // Handle the error appropriately, such as logging or displaying an error message
      return new AppError(error.message, 4000);
    }

    console.log('Connected to the MYsql database');
    // You can perform additional operations here

    // Release the connection when finished
    connection.release();
  });
};

// Call the function to connect to the database
connectToDatabase();

const queryAsync = util.promisify(db.query).bind(db);

module.exports = queryAsync;
