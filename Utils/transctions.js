const { dbPool } = require('../Database/dbPool');

async function startTransaction() {
  return dbPool.query('START TRANSACTION');
}

async function commitTransaction() {
  return dbPool.query('COMMIT');
}

async function rollbackTransaction() {
  return dbPool.query('ROLLBACK');
}

module.exports = { startTransaction, commitTransaction, rollbackTransaction };
