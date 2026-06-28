const express = require('express');
const transactionsController = require('../controllers/transactions.controller');
const {
  validateRequest,
  validatePositiveIntParam,
  validatePositiveIntRange,
  validateDate,
  validatePositiveDecimal,
  validateOptionalBoolean,
} = require('../middleware/validate-request');

const router = express.Router();

// Validators for POST/PUT body
const transactionBodyValidators = [
  validateDate('txnDate'), // date must be YYYY-MM-DD
  validatePositiveIntRange('accountId', 1, Number.MAX_SAFE_INTEGER),
  validatePositiveIntRange('categoryId', 1, Number.MAX_SAFE_INTEGER),
  validatePositiveDecimal('amount'), // amount must be > 0
  validateOptionalBoolean('isTaxClaimable', { defaultValue: false }), // optional boolean
  // note is optional, no validation needed
];

// GET /api/transactions?month=&year=&accountId=&categoryId=
router.get('/', transactionsController.getTransactions);

// GET /api/transactions/:id
router.get(
  '/:id',
  validateRequest(validatePositiveIntParam('id')),
  transactionsController.getTransactionById
);

// POST /api/transactions
router.post(
  '/',
  validateRequest(transactionBodyValidators),
  transactionsController.createTransaction
);

// PUT /api/transactions/:id
router.put(
  '/:id',
  validateRequest([validatePositiveIntParam('id'), ...transactionBodyValidators]),
  transactionsController.updateTransaction
);

// DELETE /api/transactions/:id
router.delete(
  '/:id',
  validateRequest(validatePositiveIntParam('id')),
  transactionsController.deleteTransaction
);

module.exports = router;
