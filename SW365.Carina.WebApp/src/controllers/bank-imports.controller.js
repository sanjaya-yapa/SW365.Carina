const { sendSuccess, sendError } = require('../utils/api-response');
const bankImportsService = require('../services/bank-imports.service');

function mapServiceError(err) {
  const message = err && err.message ? String(err.message) : 'Request failed';
  const lowered = message.toLowerCase();

  if (lowered.includes('not found')) {
    return { statusCode: 404, message };
  }

  if (
    lowered.includes('required') ||
    lowered.includes('category must be') ||
    lowered.includes('already been completed') ||
    lowered.includes('no import rows') ||
    lowered.includes('at least one') ||
    lowered.includes('positive integers')
  ) {
    return { statusCode: 400, message };
  }

  if (err && (err.sqlState === '45000' || err.code === 'ER_SIGNAL_EXCEPTION')) {
    return { statusCode: 409, message };
  }

  return { statusCode: 500, message: 'Internal server error' };
}

async function importRows(req, res) {
  try {
    const result = await bankImportsService.importRows(req.body.rows);
    return sendSuccess(res, result, 'Bank transactions imported successfully', 201);
  } catch (err) {
    const mapped = mapServiceError(err);
    return sendError(res, mapped.message, null, mapped.statusCode);
  }
}

async function getImports(req, res) {
  try {
    const { month, year, status } = req.query;
    const imports = await bankImportsService.getImports(
      Number(month),
      Number(year),
      String(status || 'PENDING').toUpperCase()
    );

    return sendSuccess(res, imports, 'Imported bank transactions retrieved successfully', 200);
  } catch (err) {
    const mapped = mapServiceError(err);
    return sendError(res, mapped.message, null, mapped.statusCode);
  }
}

async function getImportById(req, res) {
  try {
    const importRow = await bankImportsService.getImportById(req.params.id);
    return sendSuccess(res, importRow, 'Imported bank transaction retrieved successfully', 200);
  } catch (err) {
    const mapped = mapServiceError(err);
    return sendError(res, mapped.message, null, mapped.statusCode);
  }
}

async function completeImport(req, res) {
  try {
    const { accountId, categoryId, isTaxClaimable } = req.body;
    const importRow = await bankImportsService.completeImport(
      req.params.id,
      accountId,
      categoryId,
      isTaxClaimable
    );

    return sendSuccess(res, importRow, 'Imported bank transaction completed successfully', 200);
  } catch (err) {
    const mapped = mapServiceError(err);
    return sendError(res, mapped.message, null, mapped.statusCode);
  }
}

async function deleteImport(req, res) {
  try {
    const result = await bankImportsService.deleteImport(req.params.id);
    return sendSuccess(res, result, 'Imported bank transaction deleted successfully', 200);
  } catch (err) {
    const mapped = mapServiceError(err);
    return sendError(res, mapped.message, null, mapped.statusCode);
  }
}

async function deleteImports(req, res) {
  try {
    const result = await bankImportsService.deleteImports(req.body.ids);
    return sendSuccess(res, result, 'Imported bank transactions deleted successfully', 200);
  } catch (err) {
    const mapped = mapServiceError(err);
    return sendError(res, mapped.message, null, mapped.statusCode);
  }
}

module.exports = {
  importRows,
  getImports,
  getImportById,
  completeImport,
  deleteImport,
  deleteImports,
};
