const express = require('express');
const transactionsController = require('../controllers/transactions.controller');
const {
  validateRequest,
  validatePositiveIntParam,
  validateRequiredString,
  validateDate,
  validatePositiveDecimal
} = require('../middleware/validate-request');

const router = express.Router();

// Validators for POST/PUT body
const transactionBodyValidators = [
  validateDate('txnDate'),                                          // date must be YYYY-MM-DD
  validateRequiredString('accountId', { maxLength: 50 }),          // accountId required
  validateRequiredString('categoryId', { maxLength: 50 }),         // categoryId required
  validatePositiveDecimal('amount')                                // amount must be > 0
  // note is optional, no validation needed
];

// GET /api/transactions?month=&year=&accountId=&categoryId=
router.get('/', transactionsController.getTransactions);

// POST /api/transactions
router.post('/', validateRequest(transactionBodyValidators), transactionsController.createTransaction);

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
