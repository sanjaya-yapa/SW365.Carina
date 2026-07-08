const express = require('express');
const accountsController = require('../controllers/accounts.controller');
const {
  validateRequest,
  validatePositiveIntParam,
  validateRequiredString,
  validateEnumString,
  validateNonNegativeDecimal,
} = require('../middleware/validate-request');

const router = express.Router();
const ACCOUNT_TYPES = ['CASH', 'SAVINGS', 'CREDIT_CARD', 'DEBIT_CARD', 'DIRECT_DEBIT'];

// New types for creation
const accountBodyValidators = [
  validateRequiredString('name', { maxLength: 100 }),
  validateEnumString('accountType', ACCOUNT_TYPES),
  validateNonNegativeDecimal('openingBalance'),
];

router.get('/', accountsController.getAccounts);
router.get(
  '/:id',
  validateRequest(validatePositiveIntParam('id')),
  accountsController.getAccountById
);
router.post('/', validateRequest(accountBodyValidators), accountsController.createAccount);

// Update validators
const accountUpdateValidators = [
  validateRequiredString('name', { maxLength: 100 }),
  validateEnumString('accountType', ACCOUNT_TYPES),
  validateNonNegativeDecimal('openingBalance'),
];

router.put(
  '/:id',
  validateRequest([validatePositiveIntParam('id'), ...accountUpdateValidators]),
  accountsController.updateAccount
);
router.patch(
  '/:id/deactivate',
  validateRequest(validatePositiveIntParam('id')),
  accountsController.deactivateAccount
);
router.patch(
  '/:id/reactivate',
  validateRequest(validatePositiveIntParam('id')),
  accountsController.reactivateAccount
);

module.exports = router;
