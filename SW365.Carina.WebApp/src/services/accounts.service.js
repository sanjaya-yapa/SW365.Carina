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

async function getAccounts() {
	const execute = getExecute();
	const [rows] = await execute('CALL sp_get_accounts(?)', [0]);  // 0 = only active, 1 = include inactive
	return unwrapProcedureRows(rows);
}

async function addAccount(name, accountType, openingBalance = 0) {
	const execute = getExecute();
	const [rows] = await execute('CALL sp_add_account(?, ?, ?)', [name, accountType, openingBalance]);
	const data = unwrapProcedureRows(rows);
	return data[0] || null;
}

async function updateAccount(id, name, accountType, openingBalance = 0) {
	const execute = getExecute();
	const [rows] = await execute('CALL sp_update_account(?, ?, ?, ?)', [
		id,
		name,
		accountType,
		openingBalance
	]);
	const data = unwrapProcedureRows(rows);
	return data[0] || null;
}

async function deactivateAccount(id) {
	const execute = getExecute();
	const [rows] = await execute('CALL sp_deactivate_account(?)', [id]);
	const data = unwrapProcedureRows(rows);
	return data[0] || null;
}

module.exports = {
	getAccounts,
	addAccount,
	updateAccount,
	deactivateAccount
};

// Note: addAccount(name, accountType, openingBalance = 0)
// Note: updateAccount(id, name, accountType, openingBalance = 0)
