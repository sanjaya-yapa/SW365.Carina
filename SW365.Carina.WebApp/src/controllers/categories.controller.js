const { sendSuccess, sendError } = require('../utils/api-response');
const categoriesService = require('../services/categories.service');

function mapServiceError(err) {
  const rawMessage = err && err.message ? err.message : 'Request failed';
  const message = String(rawMessage);
  const lowered = message.toLowerCase();

  if (err && err.code === 'ER_DUP_ENTRY') {
    return { statusCode: 409, message: 'Category already exists' };
  }

  if (lowered.includes('not found')) {
    return { statusCode: 404, message: 'Category not found' };
  }

  if (lowered.includes('in use') || lowered.includes('reference') || lowered.includes('cannot')) {
    return {
      statusCode: 409,
      message: 'Category cannot be deactivated because it is referenced by transactions or budgets',
    };
  }

  if (err && (err.sqlState === '45000' || err.code === 'ER_SIGNAL_EXCEPTION')) {
    return { statusCode: 409, message: message };
  }

  return { statusCode: 500, message: 'Internal server error' };
}

async function getCategories(req, res) {
  try {
    const status = req.query.status || 'active';
    const categories = await categoriesService.getCategories(status);
    return sendSuccess(res, categories, 'Categories retrieved successfully', 200);
  } catch (err) {
    const mapped = mapServiceError(err);
    return sendError(res, mapped.message, null, mapped.statusCode);
  }
}

async function getCategoryById(req, res) {
  try {
    const { id } = req.params;
    const category = await categoriesService.getCategoryById(id);
    return sendSuccess(res, category, 'Category retrieved successfully', 200);
  } catch (err) {
    const mapped = mapServiceError(err);
    return sendError(res, mapped.message, null, mapped.statusCode);
  }
}

async function createCategory(req, res) {
  try {
    const { name, categoryType } = req.body;
    const created = await categoriesService.addCategory(name, categoryType);
    return sendSuccess(res, created, 'Category created successfully', 201);
  } catch (err) {
    const mapped = mapServiceError(err);
    return sendError(res, mapped.message, null, mapped.statusCode);
  }
}

async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, categoryType } = req.body;

    const updated = await categoriesService.updateCategory(id, name, categoryType);
    return sendSuccess(res, updated, 'Category updated successfully', 200);
  } catch (err) {
    const mapped = mapServiceError(err);
    return sendError(res, mapped.message, null, mapped.statusCode);
  }
}

async function deactivateCategory(req, res) {
  try {
    const { id } = req.params;
    const result = await categoriesService.deactivateCategory(id);
    return sendSuccess(res, result, 'Category deactivated successfully', 200);
  } catch (err) {
    const mapped = mapServiceError(err);
    return sendError(res, mapped.message, null, mapped.statusCode);
  }
}

async function reactivateCategory(req, res) {
  try {
    const { id } = req.params;
    const result = await categoriesService.reactivateCategory(id);
    return sendSuccess(res, result, 'Category reactivated successfully', 200);
  } catch (err) {
    const mapped = mapServiceError(err);
    return sendError(res, mapped.message, null, mapped.statusCode);
  }
}

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deactivateCategory,
  reactivateCategory,
};
