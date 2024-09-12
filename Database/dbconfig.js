const util = require('util');
const db = require('./dbPool.js');
const AppError = require('../Utils/appError.js');

// Function to establish database connection
const connectToDatabase = () => {
  db.getConnection((error, connection) => {
    if (error) {
      // console.error('Error connecting to the database:', error.message);
      // Handle the error appropriately, such as logging or displaying an error message
      return new AppError(error.message, 400);
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
