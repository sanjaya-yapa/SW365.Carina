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
 * Get monthly summary (planned vs actual vs variance)
 * @param {number} year - Budget year (2000-2100)
 * @param {number} month - Budget month (1-12)
 * @returns {Promise<Object>} Monthly summary with totals and variance
 */
async function getMonthSummary(year, month) {
  try {
    console.log('🔍 DEBUG: getMonthSummary called with:', { year, month });
    const execute = getExecute();
    console.log('✅ DEBUG: Database executor obtained');

    console.log('🔍 DEBUG: Calling sp_get_monthly_summary with params:', [year, month]);
    const [rows] = await execute(
      'CALL sp_get_monthly_summary(?, ?)',
      [year, month]
    );
    console.log('✅ DEBUG: Stored procedure returned:', rows);

    const data = unwrapProcedureRows(rows);
    console.log('✅ DEBUG: Unwrapped data:', data);

    return data[0] || null;
  } catch (err) {
    console.error('❌ DEBUG: getMonthSummary error:', {
      message: err.message,
      code: err.code,
      sqlState: err.sqlState,
      stack: err.stack
    });
    throw err;
  }
}

/**
 * Get monthly category variance breakdown
 * @param {number} year - Budget year (2000-2100)
 * @param {number} month - Budget month (1-12)
 * @returns {Promise<Array>} Array of category variance objects
 */
async function getMonthCategoryVariance(year, month) {
  try {
    console.log('🔍 DEBUG: getMonthCategoryVariance called with:', { year, month });
    const execute = getExecute();
    console.log('✅ DEBUG: Database executor obtained');

    console.log('🔍 DEBUG: Calling sp_get_monthly_category_variance with params:', [year, month]);
    const [rows] = await execute(
      'CALL sp_get_monthly_category_variance(?, ?)',
      [year, month]
    );
    console.log('✅ DEBUG: Stored procedure returned:', rows);

    const data = unwrapProcedureRows(rows);
    console.log('✅ DEBUG: Unwrapped data:', data);

    return data;
  } catch (err) {
    console.error('❌ DEBUG: getMonthCategoryVariance error:', {
      message: err.message,
      code: err.code,
      sqlState: err.sqlState,
      stack: err.stack
    });
    throw err;
  }
}

/**
 * Get annual expense trend for the year
 * @param {number} year - Budget year (2000-2100)
 * @returns {Promise<Array>} Array of monthly trend objects
 */
async function getAnnualExpenseTrend(year) {
  try {
    console.log('🔍 DEBUG: getAnnualExpenseTrend called with:', { year });
    const execute = getExecute();
    console.log('✅ DEBUG: Database executor obtained');

    console.log('🔍 DEBUG: Calling sp_get_annual_expense_trend with params:', [year]);
    const [rows] = await execute(
      'CALL sp_get_annual_expense_trend(?)',
      [year]
    );
    console.log('✅ DEBUG: Stored procedure returned:', rows);

    const data = unwrapProcedureRows(rows);
    console.log('✅ DEBUG: Unwrapped data:', data);

    return data;
  } catch (err) {
    console.error('❌ DEBUG: getAnnualExpenseTrend error:', {
      message: err.message,
      code: err.code,
      sqlState: err.sqlState,
      stack: err.stack
    });
    throw err;
  }
}

module.exports = {
  getMonthSummary,
  getMonthCategoryVariance,
  getAnnualExpenseTrend
};
