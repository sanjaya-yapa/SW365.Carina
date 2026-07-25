const crypto = require('crypto');
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

function createImportHash(row) {
  return crypto
    .createHash('sha256')
    .update(`${row.txnDate}|${Number(row.signedAmount).toFixed(2)}|${row.description.trim()}`)
    .digest('hex');
}

function normalizeImportIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('At least one imported transaction ID is required');
  }

  const normalizedIds = [...new Set(ids.map((id) => Number(id)))];

  if (normalizedIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new Error('Imported transaction IDs must be positive integers');
  }

  return normalizedIds;
}

function normalizeImportedRow(row) {
  const signedAmount = Number(row.signedAmount);
  const description = typeof row.description === 'string' ? row.description.trim() : '';
  const dateText = typeof row.txnDate === 'string' ? row.txnDate.trim() : '';

  if (!dateText || !Number.isFinite(signedAmount) || signedAmount === 0 || !description) {
    throw new Error('Each import row requires txnDate, non-zero signedAmount, and description');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText) || Number.isNaN(new Date(dateText).getTime())) {
    throw new Error('Each import row requires txnDate in YYYY-MM-DD format');
  }

  return {
    txnDate: dateText,
    signedAmount,
    amount: Math.abs(signedAmount),
    description: description.slice(0, 255),
  };
}

async function importRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('No import rows were provided');
  }

  const execute = getExecute();
  const normalizedRows = rows.map(normalizeImportedRow);
  let inserted = 0;
  let skipped = 0;

  for (const row of normalizedRows) {
    const importHash = createImportHash(row);
    const [result] = await execute(
      `INSERT IGNORE INTO bank_transaction_imports (
        import_hash,
        txn_date,
        signed_amount,
        amount,
        description
      )
      VALUES (?, ?, ?, ?, ?)`,
      [importHash, row.txnDate, row.signedAmount, row.amount, row.description]
    );

    if (result.affectedRows === 1) {
      inserted += 1;
    } else {
      skipped += 1;
    }
  }

  return { inserted, skipped, total: normalizedRows.length };
}

async function getImports(txnMonth, txnYear, status = 'PENDING') {
  const execute = getExecute();
  const params = [txnYear, txnMonth];
  let statusFilter = '';

  if (status !== 'ALL') {
    statusFilter = 'AND bi.status = ?';
    params.push(status);
  }

  const [rows] = await execute(
    `SELECT
      bi.import_id,
      bi.txn_date,
      bi.signed_amount,
      bi.amount,
      bi.description,
      bi.account_id,
      a.account_name,
      bi.category_id,
      c.category_name,
      c.category_type,
      bi.is_tax_claimable,
      bi.status,
      bi.transaction_id,
      bi.created_at,
      bi.updated_at
    FROM bank_transaction_imports bi
    LEFT JOIN accounts a ON a.account_id = bi.account_id
    LEFT JOIN categories c ON c.category_id = bi.category_id
    WHERE YEAR(bi.txn_date) = ?
      AND MONTH(bi.txn_date) = ?
      ${statusFilter}
    ORDER BY bi.txn_date DESC, bi.import_id DESC`,
    params
  );

  return rows;
}

async function getImportById(id) {
  const execute = getExecute();
  const [rows] = await execute(
    `SELECT
      bi.import_id,
      bi.txn_date,
      bi.signed_amount,
      bi.amount,
      bi.description,
      bi.account_id,
      a.account_name,
      bi.category_id,
      c.category_name,
      c.category_type,
      bi.is_tax_claimable,
      bi.status,
      bi.transaction_id,
      bi.created_at,
      bi.updated_at
    FROM bank_transaction_imports bi
    LEFT JOIN accounts a ON a.account_id = bi.account_id
    LEFT JOIN categories c ON c.category_id = bi.category_id
    WHERE bi.import_id = ?
    LIMIT 1`,
    [id]
  );

  const importRow = Array.isArray(rows) ? rows[0] : null;
  if (!importRow) {
    throw new Error('Imported transaction not found');
  }

  return importRow;
}

async function getCategoryType(categoryId) {
  const execute = getExecute();
  const [rows] = await execute(
    'SELECT category_type FROM categories WHERE category_id = ? AND is_active = 1 LIMIT 1',
    [categoryId]
  );

  const category = Array.isArray(rows) ? rows[0] : null;
  if (!category) {
    throw new Error('Active category is required');
  }

  return category.category_type;
}

async function completeImport(id, accountId, categoryId, isTaxClaimable = false) {
  const importRow = await getImportById(id);

  if (importRow.status !== 'PENDING') {
    throw new Error('Imported transaction has already been completed');
  }

  const expectedCategoryType = Number(importRow.signed_amount) > 0 ? 'INCOME' : 'EXPENSE';
  const categoryType = await getCategoryType(categoryId);

  if (categoryType !== expectedCategoryType) {
    throw new Error(`Category must be ${expectedCategoryType} for this imported amount`);
  }

  const finalTaxClaimable = expectedCategoryType === 'EXPENSE' ? isTaxClaimable : false;
  const connection = db && typeof db.getConnection === 'function' ? await db.getConnection() : null;

  if (!connection) {
    throw new Error('Database connection is not configured');
  }

  try {
    await connection.beginTransaction();

    const [procedureRows] = await connection.execute('CALL sp_add_transaction(?, ?, ?, ?, ?, ?)', [
      importRow.txn_date,
      accountId,
      categoryId,
      Number(importRow.amount),
      finalTaxClaimable,
      importRow.description,
    ]);

    const transaction = unwrapProcedureRows(procedureRows)[0] || {};
    const transactionId = transaction.transactionId ?? transaction.transaction_id;

    if (!transactionId) {
      throw new Error('Transaction could not be created from imported row');
    }

    await connection.execute(
      `UPDATE bank_transaction_imports
      SET
        account_id = ?,
        category_id = ?,
        is_tax_claimable = ?,
        status = 'IMPORTED',
        transaction_id = ?
      WHERE import_id = ?`,
      [accountId, categoryId, finalTaxClaimable, transactionId, id]
    );

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  return getImportById(id);
}

async function deleteImport(id) {
  const execute = getExecute();
  const [result] = await execute(
    "DELETE FROM bank_transaction_imports WHERE import_id = ? AND status = 'PENDING'",
    [id]
  );

  if (!result || result.affectedRows === 0) {
    throw new Error('Pending imported transaction not found');
  }

  return { affectedRows: result.affectedRows };
}

async function deleteImports(ids) {
  const normalizedIds = normalizeImportIds(ids);
  const execute = getExecute();
  const placeholders = normalizedIds.map(() => '?').join(', ');
  const [result] = await execute(
    `DELETE FROM bank_transaction_imports
    WHERE status = 'PENDING'
      AND import_id IN (${placeholders})`,
    normalizedIds
  );

  return { affectedRows: result.affectedRows, requestedRows: normalizedIds.length };
}

module.exports = {
  importRows,
  getImports,
  getImportById,
  completeImport,
  deleteImport,
  deleteImports,
};
