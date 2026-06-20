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

async function getCategories(status = 'active') {
  const execute = getExecute();
  const statusFilters = {
    active: 'WHERE is_active = 1',
    deleted: 'WHERE is_active = 0',
    all: '',
  };
  const whereClause = statusFilters[status] ?? statusFilters.active;

  const [rows] = await execute(
    `SELECT
			category_id,
			category_name,
			category_type,
			is_active,
			created_at,
			updated_at
		FROM categories
		${whereClause}
		ORDER BY category_type, category_name`
  );

  return rows;
}

async function getCategoryById(id) {
  const execute = getExecute();
  const [rows] = await execute(
    `SELECT
			category_id,
			category_name,
			category_type,
			is_active,
			created_at,
			updated_at
		FROM categories
		WHERE category_id = ?
		LIMIT 1`,
    [id]
  );

  const category = Array.isArray(rows) ? rows[0] : null;
  if (!category) {
    throw new Error('Category not found');
  }

  return category;
}

async function addCategory(name, categoryType) {
  const execute = getExecute();
  const [rows] = await execute('CALL sp_add_category(?, ?)', [name, categoryType]);
  const data = unwrapProcedureRows(rows);
  return data[0] || null;
}

async function updateCategory(id, name, categoryType) {
  const execute = getExecute();
  const [rows] = await execute('CALL sp_update_category(?, ?, ?)', [id, name, categoryType]);
  const data = unwrapProcedureRows(rows);
  return data[0] || null;
}

async function deactivateCategory(id) {
  const execute = getExecute();
  const [rows] = await execute('CALL sp_deactivate_category(?)', [id]);
  const data = unwrapProcedureRows(rows);
  return data[0] || null;
}

async function reactivateCategory(id) {
  const execute = getExecute();
  const [result] = await execute('UPDATE categories SET is_active = 1 WHERE category_id = ?', [id]);

  if (!result || result.affectedRows === 0) {
    throw new Error('Category not found');
  }

  return { affectedRows: result.affectedRows };
}

module.exports = {
  getCategories,
  getCategoryById,
  addCategory,
  updateCategory,
  deactivateCategory,
  reactivateCategory,
};
