const db = require('./dbPool.js');

// Transaction wrapper function using promises
const runTransaction = async (transactionFn) => {
  let connection;

  try {
    // Obtain a connection from the pool
    connection = db.getConnection();

    // Start the transaction
    await connection.beginTransaction();

    // Run the transaction function
    await transactionFn(connection);

    // Commit the transaction
    await connection.commit();
  } catch (error) {
    if (connection) {
      await connection.rollback(); // Rollback the transaction in case of an error
    }
    throw error;
  } finally {
    if (connection) {
      connection.release(); // Release the connection back to the pool
    }
  }
};

module.exports = runTransaction;
