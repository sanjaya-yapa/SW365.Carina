const db = require('../config/db');

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

function unwrapProcedureRows(resultRows) {
  if (!Array.isArray(resultRows)) {
    return [];
  }

  if (Array.isArray(resultRows[0])) {
    return resultRows[0];
  }

  return resultRows;
}

async function getAccounts(status = 'active') {
  const execute = getExecute();
  const statusFilters = {
    active: 'WHERE is_active = 1',
    deleted: 'WHERE is_active = 0',
    all: '',
  };
  const whereClause = statusFilters[status] ?? statusFilters.active;

  const [rows] = await execute(
    `SELECT
      account_id,
      account_name,
      account_type,
      opening_balance,
      is_active,
      created_at,
      updated_at
    FROM accounts
    ${whereClause}
    ORDER BY account_name`
  );

  return rows;
}

async function getAccountById(id) {
  const execute = getExecute();
  const [rows] = await execute(
    `SELECT
			account_id,
			account_name,
			account_type,
			opening_balance,
			is_active,
			created_at,
			updated_at
		FROM accounts
		WHERE account_id = ?
		LIMIT 1`,
    [id]
  );

  const account = Array.isArray(rows) ? rows[0] : null;
  if (!account) {
    throw new Error('Account not found');
  }

  return account;
}

async function addAccount(name, accountType, openingBalance = 0) {
  try {
    console.log('🔍 DEBUG: Service adding account', { name, accountType, openingBalance });
    const execute = getExecute();
    const [rows] = await execute('CALL sp_add_account(?, ?, ?)', [
      name,
      accountType,
      openingBalance,
    ]);
    const data = unwrapProcedureRows(rows);
    console.log('✅ DEBUG: Service successfully added account', data[0]);
    return data[0] || null;
  } catch (err) {
    console.error('❌ ERROR: Service failed to add account', {
      name,
      accountType,
      error: err.message,
    });
    throw err;
  }
}

async function updateAccount(id, name, accountType, openingBalance = 0) {
  try {
    console.log('🔍 DEBUG: Service updating account', { id, name, accountType, openingBalance });
    const execute = getExecute();
    const [rows] = await execute('CALL sp_update_account(?, ?, ?, ?)', [
      id,
      name,
      accountType,
      openingBalance,
    ]);
    const data = unwrapProcedureRows(rows);
    console.log('✅ DEBUG: Service successfully updated account', data[0]);
    return data[0] || null;
  } catch (err) {
    console.error('❌ ERROR: Service failed to update account', {
      id,
      name,
      accountType,
      error: err.message,
    });
    throw err;
  }
}

async function deactivateAccount(id) {
  try {
    console.log('🔍 DEBUG: Service deactivating account', { id });
    const execute = getExecute();
    const [rows] = await execute('CALL sp_deactivate_account(?)', [id]);
    const data = unwrapProcedureRows(rows);
    console.log('✅ DEBUG: Service successfully deactivated account', data[0]);
    return data[0] || null;
  } catch (err) {
    console.error('❌ ERROR: Service failed to deactivate account', { id, error: err.message });
    throw err;
  }
}

async function reactivateAccount(id) {
  const execute = getExecute();
  const [result] = await execute('UPDATE accounts SET is_active = 1 WHERE account_id = ?', [id]);

  if (!result || result.affectedRows === 0) {
    throw new Error('Account not found');
  }

  return { affectedRows: result.affectedRows };
}

module.exports = {
  getAccounts,
  getAccountById,
  addAccount,
  updateAccount,
  deactivateAccount,
  reactivateAccount,
};

// Note: addAccount(name, accountType, openingBalance = 0)
// Note: updateAccount(id, name, accountType, openingBalance = 0)
