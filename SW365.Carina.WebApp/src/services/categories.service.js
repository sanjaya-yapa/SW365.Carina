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

async function getCategories() {
	const execute = getExecute();
	const [rows] = await execute('CALL sp_get_categories(?)', [0]);  // 0 = only active, 1 = include inactive
	return unwrapProcedureRows(rows);
}

async function addCategory(name, categoryType) {
	const execute = getExecute();
	const [rows] = await execute('CALL sp_add_category(?, ?)', [name, categoryType]);
	const data = unwrapProcedureRows(rows);
	return data[0] || null;
}

async function updateCategory(id, name, categoryType) {
	const execute = getExecute();
	const [rows] = await execute('CALL sp_update_category(?, ?, ?)', [
		id,
		name,
		categoryType
	]);
	const data = unwrapProcedureRows(rows);
	return data[0] || null;
}

async function deactivateCategory(id) {
	const execute = getExecute();
	const [rows] = await execute('CALL sp_deactivate_category(?)', [id]);
	const data = unwrapProcedureRows(rows);
	return data[0] || null;
}

module.exports = {
	getCategories,
	addCategory,
	updateCategory,
	deactivateCategory
};
