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
    const [rows] = await execute('CALL sp_get_monthly_summary(?, ?)', [year, month]);
    console.log('✅ DEBUG: Stored procedure returned:', rows);

    const data = unwrapProcedureRows(rows);
    console.log('✅ DEBUG: Unwrapped data:', data);

    return data[0] || null;
  } catch (err) {
    console.error('❌ DEBUG: getMonthSummary error:', {
      message: err.message,
      code: err.code,
      sqlState: err.sqlState,
      stack: err.stack,
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
    const [rows] = await execute('CALL sp_get_monthly_category_variance(?, ?)', [year, month]);
    console.log('✅ DEBUG: Stored procedure returned:', rows);

    const data = unwrapProcedureRows(rows);
    console.log('✅ DEBUG: Unwrapped data:', data);

    return data;
  } catch (err) {
    console.error('❌ DEBUG: getMonthCategoryVariance error:', {
      message: err.message,
      code: err.code,
      sqlState: err.sqlState,
      stack: err.stack,
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
    const [rows] = await execute('CALL sp_get_annual_expense_trend(?)', [year]);
    console.log('✅ DEBUG: Stored procedure returned:', rows);

    const data = unwrapProcedureRows(rows);
    console.log('✅ DEBUG: Unwrapped data:', data);

    return data;
  } catch (err) {
    console.error('❌ DEBUG: getAnnualExpenseTrend error:', {
      message: err.message,
      code: err.code,
      sqlState: err.sqlState,
      stack: err.stack,
    });
    throw err;
  }
}

// Keep DECIMAL amounts exact while accumulating totals, including large reports.
function toCents(amount) {
  const [whole, fraction = ''] = String(amount).split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

function fromCents(cents) {
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

async function getMonthlyExpenses(year, month, isRegular = null) {
  return getGroupedMonthlyExpenses(year, month, isRegular, false);
}

async function getOwnerExpenses(year, month, isRegular = null) {
  return getGroupedMonthlyExpenses(year, month, isRegular, true);
}

async function getGroupedMonthlyExpenses(year, month, isRegular, byOwner) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end =
    month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const [rows] = await getExecute()(
    `SELECT t.transaction_id, t.txn_date, t.note, t.amount, t.is_regular,
            c.category_id, c.category_name, a.account_name
            ${byOwner ? ', t.owner_id, o.full_name AS owner_full_name' : ''}
       FROM transactions t
       INNER JOIN categories c ON c.category_id = t.category_id
       INNER JOIN accounts a ON a.account_id = t.account_id
       ${byOwner ? 'LEFT JOIN transaction_owners o ON o.owner_id = t.owner_id' : ''}
      WHERE c.category_type = 'EXPENSE' AND t.txn_date >= ? AND t.txn_date < ?
      ${isRegular === null ? '' : 'AND t.is_regular = ?'}
      ORDER BY ${byOwner ? 'o.full_name, t.owner_id' : 'c.category_name, c.category_id'}, t.txn_date, t.transaction_id`,
    isRegular === null ? [start, end] : [start, end, isRegular]
  );
  const groups = new Map();
  let grandTotal = 0n;
  for (const row of rows) {
    const key = String(byOwner ? row.owner_id : row.category_id);
    if (!groups.has(key)) {
      groups.set(key, {
        ...(byOwner
          ? { owner_id: row.owner_id, owner_name: row.owner_full_name || 'Unassigned' }
          : { category_id: row.category_id, category_name: row.category_name }),
        expenses: [],
        cents: 0n,
      });
    }
    const group = groups.get(key);
    const cents = toCents(row.amount);
    group.expenses.push({
      transaction_id: row.transaction_id,
      date: row.txn_date,
      description: row.note || `Expense #${row.transaction_id}`,
      account_name: row.account_name,
      ...(byOwner ? { category_name: row.category_name } : {}),
      is_regular: Number(row.is_regular) === 1,
      amount: fromCents(cents),
    });
    group.cents += cents;
    grandTotal += cents;
  }
  return {
    year,
    month,
    [byOwner ? 'owners' : 'categories']: Array.from(groups.values(), ({ cents, ...group }) => ({
      ...group,
      total: fromCents(cents),
    })),
    grand_total: fromCents(grandTotal),
  };
}

module.exports = {
  getOwnerExpenses,
  getMonthlyAnalysis,
  getMonthlyExpenses,
  getMonthSummary,
  getMonthCategoryVariance,
  getAnnualExpenseTrend,
};

async function getMonthlyAnalysis(year, isRegular = null) {
  const params = [`${year}-01-01`, `${year + 1}-01-01`];
  if (isRegular !== null) params.push(isRegular);
  const [rows] = await getExecute()(
    `SELECT c.category_id, c.category_name, MONTH(t.txn_date) AS expense_month,
            SUM(t.amount) AS total
       FROM transactions t
       INNER JOIN categories c ON c.category_id = t.category_id
      WHERE c.category_type = 'EXPENSE' AND t.txn_date >= ? AND t.txn_date < ?
      ${isRegular === null ? '' : 'AND t.is_regular = ?'}
      GROUP BY c.category_id, c.category_name, MONTH(t.txn_date)
      ORDER BY c.category_name, c.category_id, expense_month`,
    params
  );
  const groups = new Map();
  const totals = Array(12).fill(0n);
  for (const row of rows) {
    const key = String(row.category_id);
    if (!groups.has(key))
      groups.set(key, {
        category_id: row.category_id,
        category_name: row.category_name,
        months: Array(12).fill(0n),
      });
    const index = Number(row.expense_month) - 1;
    const cents = toCents(row.total);
    groups.get(key).months[index] += cents;
    totals[index] += cents;
  }
  return {
    year,
    categories: [...groups.values()].map((group) => ({
      ...group,
      months: group.months.map(fromCents),
      total: fromCents(group.months.reduce((sum, amount) => sum + amount, 0n)),
    })),
    monthly_totals: totals.map(fromCents),
    grand_total: fromCents(totals.reduce((sum, amount) => sum + amount, 0n)),
  };
}
