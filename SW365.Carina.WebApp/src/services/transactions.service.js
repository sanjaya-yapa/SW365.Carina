const db = require('../config/db');

/**
 * Helper: Get the appropriate database execute function
 * Handles different mysql2 configurations (direct execute or pool.execute)
 */
function getExecute() {
  if (db && typeof db.execute === 'function') {
    return db.execute.bind(db);
  }

  if (db && db.pool && typeof db.pool.execute === 'function') {
    return db.pool.execute.bind(db.pool);
  }

  if (db && typeof db.query === 'function') {
    return db.query.bind(db);
  }

  throw new Error('Database executor is not configured');
}

/**
 * Helper: Unwrap stored procedure result rows
 * MySQL returns results in different formats depending on the library version
 */
function unwrapProcedureRows(resultRows) {
  if (!Array.isArray(resultRows)) {
    return [];
  }

  if (Array.isArray(resultRows[0])) {
    return resultRows[0];
  }

  return resultRows;
}

/**
 * Get all transactions for a given month (optionally filtered by account/category)
 * @param {number} txnMonth - Transaction month (1-12)
 * @param {number} txnYear - Transaction year (e.g., 2025)
 * @param {string} [accountId] - Optional account filter
 * @param {string} [categoryId] - Optional category filter
 * @returns {Promise<Array>} Array of transaction objects
 */
async function getTransactions(txnMonth, txnYear, accountId = null, categoryId = null) {
  try {
    console.log('🔍 DEBUG: getTransactions called with:', {
      txnMonth,
      txnYear,
      accountId,
      categoryId,
    });
    const execute = getExecute();
    console.log('✅ DEBUG: Database executor obtained');

    console.log('🔍 DEBUG: Calling sp_get_transactions with params:', [
      txnYear,
      txnMonth,
      accountId,
      categoryId,
    ]);
    const [rows] = await execute('CALL sp_get_transactions(?, ?, ?, ?)', [
      txnYear,
      txnMonth,
      accountId,
      categoryId,
    ]);
    console.log('✅ DEBUG: Stored procedure returned:', rows);

    const data = unwrapProcedureRows(rows);
    console.log('✅ DEBUG: Unwrapped data:', data);

    return data;
  } catch (err) {
    console.error('❌ DEBUG: getTransactions error:', {
      message: err.message,
      code: err.code,
      sqlState: err.sqlState,
      stack: err.stack,
    });
    throw err;
  }
}

async function getTransactionById(id) {
  const execute = getExecute();
  const [rows] = await execute(
    `SELECT
      t.transaction_id,
      t.txn_date,
      t.account_id,
      a.account_name,
      t.category_id,
      c.category_name,
      c.category_type,
      t.amount,
      t.note,
      t.created_at,
      t.updated_at
    FROM transactions t
    INNER JOIN accounts a ON a.account_id = t.account_id
    INNER JOIN categories c ON c.category_id = t.category_id
    WHERE t.transaction_id = ?
    LIMIT 1`,
    [id]
  );

  const transaction = Array.isArray(rows) ? rows[0] : null;
  if (!transaction) {
    throw new Error('Transaction not found');
  }

  return transaction;
}

/**
 * Add a new transaction
 * @param {string} txnDate - Transaction date (YYYY-MM-DD)
 * @param {string} accountId - Account ID
 * @param {string} categoryId - Category ID
 * @param {number} amount - Transaction amount (positive)
 * @param {string} [note] - Optional transaction note
 * @returns {Promise<Object>} The created transaction record
 */
async function addTransaction(txnDate, accountId, categoryId, amount, note = null) {
  try {
    console.log('🔍 DEBUG: addTransaction called with:', {
      txnDate,
      accountId,
      categoryId,
      amount,
      note,
    });
    const execute = getExecute();
    console.log('✅ DEBUG: Database executor obtained');

    console.log('🔍 DEBUG: Calling sp_add_transaction with params:', [
      txnDate,
      accountId,
      categoryId,
      amount,
      note,
    ]);
    const [rows] = await execute('CALL sp_add_transaction(?, ?, ?, ?, ?)', [
      txnDate,
      accountId,
      categoryId,
      amount,
      note,
    ]);
    console.log('✅ DEBUG: Stored procedure returned:', rows);

    const data = unwrapProcedureRows(rows);
    console.log('✅ DEBUG: Unwrapped data:', data);

    return data[0] || null;
  } catch (err) {
    console.error('❌ DEBUG: addTransaction error:', {
      message: err.message,
      code: err.code,
      sqlState: err.sqlState,
      stack: err.stack,
    });
    throw err;
  }
}

/**
 * Update an existing transaction
 * @param {string} id - Transaction ID
 * @param {string} txnDate - Transaction date (YYYY-MM-DD)
 * @param {string} accountId - Account ID
 * @param {string} categoryId - Category ID
 * @param {number} amount - Transaction amount (positive)
 * @param {string} [note] - Optional transaction note
 * @returns {Promise<Object>} The updated transaction record
 */
async function updateTransaction(id, txnDate, accountId, categoryId, amount, note = null) {
  try {
    console.log('🔍 DEBUG: updateTransaction called with:', {
      id,
      txnDate,
      accountId,
      categoryId,
      amount,
      note,
    });
    const execute = getExecute();
    console.log('✅ DEBUG: Database executor obtained');

    console.log('🔍 DEBUG: Calling sp_update_transaction with params:', [
      id,
      txnDate,
      accountId,
      categoryId,
      amount,
      note,
    ]);
    const [rows] = await execute('CALL sp_update_transaction(?, ?, ?, ?, ?, ?)', [
      id,
      txnDate,
      accountId,
      categoryId,
      amount,
      note,
    ]);
    console.log('✅ DEBUG: Stored procedure returned:', rows);

    const data = unwrapProcedureRows(rows);
    console.log('✅ DEBUG: Unwrapped data:', data);

    return data[0] || null;
  } catch (err) {
    console.error('❌ DEBUG: updateTransaction error:', {
      message: err.message,
      code: err.code,
      sqlState: err.sqlState,
      stack: err.stack,
    });
    throw err;
  }
}

/**
 * Delete a transaction
 * @param {string} id - Transaction ID
 * @returns {Promise<Object>} The deleted transaction record
 */
async function deleteTransaction(id) {
  try {
    console.log('🔍 DEBUG: deleteTransaction called with:', { id });
    const execute = getExecute();
    console.log('✅ DEBUG: Database executor obtained');

    console.log('🔍 DEBUG: Calling sp_delete_transaction with params:', [id]);
    const [rows] = await execute('CALL sp_delete_transaction(?)', [id]);
    console.log('✅ DEBUG: Stored procedure returned:', rows);

    const data = unwrapProcedureRows(rows);
    console.log('✅ DEBUG: Unwrapped data:', data);

    return data[0] || null;
  } catch (err) {
    console.error('❌ DEBUG: deleteTransaction error:', {
      message: err.message,
      code: err.code,
      sqlState: err.sqlState,
      stack: err.stack,
    });
    throw err;
  }
}

module.exports = {
  getTransactions,
  getTransactionById,
  addTransaction,
  updateTransaction,
  deleteTransaction,
};
