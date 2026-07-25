const { sendSuccess, sendError } = require('../utils/api-response');
const transactionsService = require('../services/transactions.service');

function mapServiceError(err) {
  const rawMessage = err && err.message ? err.message : 'Request failed';
  const message = String(rawMessage);
  const lowered = message.toLowerCase();

  if (lowered.includes('not found') || lowered.includes('does not exist')) {
    return { statusCode: 404, message: 'Transaction, account, or category not found' };
  }

  if (lowered.includes('at least one') || lowered.includes('positive integers')) {
    return { statusCode: 400, message: message };
  }

  if (lowered.includes('invalid') || lowered.includes('reference')) {
    return { statusCode: 409, message: message };
  }

  if (err && (err.sqlState === '45000' || err.code === 'ER_SIGNAL_EXCEPTION')) {
    return { statusCode: 409, message: message };
  }

  return { statusCode: 500, message: 'Internal server error' };
}

/**
 * GET /api/transactions?month=&year=&accountId=&categoryId=
 * Retrieve transactions for a month with optional filters
 */
async function getTransactions(req, res) {
  try {
    const { month, year, accountId, categoryId } = req.query;
    console.log('🔍 DEBUG: Controller received query:', { month, year, accountId, categoryId });

    const txns = await transactionsService.getTransactions(
      parseInt(month),
      parseInt(year),
      accountId || null,
      categoryId || null
    );
    console.log('✅ DEBUG: Controller received result from service:', txns);

    return sendSuccess(res, txns, 'Transactions retrieved successfully', 200);
  } catch (err) {
    const mapped = mapServiceError(err);
    return sendError(res, mapped.message, null, mapped.statusCode);
  }
}

async function getTransactionById(req, res) {
  try {
    const { id } = req.params;
    const transaction = await transactionsService.getTransactionById(id);

    return sendSuccess(res, transaction, 'Transaction retrieved successfully', 200);
  } catch (err) {
    const mapped = mapServiceError(err);
    return sendError(res, mapped.message, null, mapped.statusCode);
  }
}

/**
 * POST /api/transactions
 * Create a new transaction
 * Request body: { txnDate, accountId, categoryId, amount, isTaxClaimable, note }
 */
async function createTransaction(req, res) {
  try {
    const { txnDate, accountId, categoryId, amount, isTaxClaimable, note } = req.body;
    console.log('🔍 DEBUG: Controller received body:', {
      txnDate,
      accountId,
      categoryId,
      amount,
      isTaxClaimable,
      note,
    });

    const result = await transactionsService.addTransaction(
      txnDate,
      accountId,
      categoryId,
      amount,
      isTaxClaimable,
      note || null
    );
    console.log('✅ DEBUG: Controller received result from service:', result);

    return sendSuccess(res, result, 'Transaction created successfully', 201);
  } catch (err) {
    const mapped = mapServiceError(err);
    return sendError(res, mapped.message, null, mapped.statusCode);
  }
}

/**
 * PUT /api/transactions/:id
 * Update an existing transaction
 * Request body: { txnDate, accountId, categoryId, amount, isTaxClaimable, note }
 */
async function updateTransaction(req, res) {
  try {
    const { id } = req.params;
    const { txnDate, accountId, categoryId, amount, isTaxClaimable, note } = req.body;
    console.log('🔍 DEBUG: Controller received params/body:', {
      id,
      txnDate,
      accountId,
      categoryId,
      amount,
      isTaxClaimable,
      note,
    });

    const result = await transactionsService.updateTransaction(
      id,
      txnDate,
      accountId,
      categoryId,
      amount,
      isTaxClaimable,
      note || null
    );
    console.log('✅ DEBUG: Controller received result from service:', result);

    return sendSuccess(res, result, 'Transaction updated successfully', 200);
  } catch (err) {
    const mapped = mapServiceError(err);
    return sendError(res, mapped.message, null, mapped.statusCode);
  }
}

/**
 * DELETE /api/transactions/:id
 * Delete a transaction
 */
async function deleteTransaction(req, res) {
  try {
    const { id } = req.params;
    console.log('🔍 DEBUG: Controller received params:', { id });

    const result = await transactionsService.deleteTransaction(id);
    console.log('✅ DEBUG: Controller received result from service:', result);

    return sendSuccess(res, result, 'Transaction deleted successfully', 200);
  } catch (err) {
    const mapped = mapServiceError(err);
    return sendError(res, mapped.message, null, mapped.statusCode);
  }
}

async function deleteTransactions(req, res) {
  try {
    const result = await transactionsService.deleteTransactions(req.body.ids);
    return sendSuccess(res, result, 'Transactions deleted successfully', 200);
  } catch (err) {
    const mapped = mapServiceError(err);
    return sendError(res, mapped.message, null, mapped.statusCode);
  }
}

module.exports = {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  deleteTransactions,
};
