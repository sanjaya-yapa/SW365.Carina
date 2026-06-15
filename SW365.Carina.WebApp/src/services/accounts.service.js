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
	try {
		console.log('🔍 DEBUG: Service calling sp_get_accounts');
		const execute = getExecute();
		const [rows] = await execute('CALL sp_get_accounts(?)', [0]);  // 0 = only active, 1 = include inactive
		const data = unwrapProcedureRows(rows);
		console.log('✅ DEBUG: Service retrieved', data.length, 'accounts');
		return data;
	} catch (err) {
		console.error('❌ ERROR: Service failed to get accounts', err);
		throw err;
	}
}

async function addAccount(name, accountType, openingBalance = 0) {
	try {
		console.log('🔍 DEBUG: Service adding account', { name, accountType, openingBalance });
		const execute = getExecute();
		const [rows] = await execute('CALL sp_add_account(?, ?, ?)', [name, accountType, openingBalance]);
		const data = unwrapProcedureRows(rows);
		console.log('✅ DEBUG: Service successfully added account', data[0]);
		return data[0] || null;
	} catch (err) {
		console.error('❌ ERROR: Service failed to add account', { name, accountType, error: err.message });
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
			openingBalance
		]);
		const data = unwrapProcedureRows(rows);
		console.log('✅ DEBUG: Service successfully updated account', data[0]);
		return data[0] || null;
	} catch (err) {
		console.error('❌ ERROR: Service failed to update account', { id, name, accountType, error: err.message });
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

module.exports = {
	getAccounts,
	addAccount,
	updateAccount,
	deactivateAccount
};

// Note: addAccount(name, accountType, openingBalance = 0)
// Note: updateAccount(id, name, accountType, openingBalance = 0)
