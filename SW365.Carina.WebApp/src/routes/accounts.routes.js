const express = require('express');
const accountsController = require('../controllers/accounts.controller');
const {
	validateRequest,
	validatePositiveIntParam,
	validateRequiredString,
	validateEnumString,
	validateNonNegativeDecimal
} = require('../middleware/validate-request');

const router = express.Router();

const accountBodyValidators = [
	validateRequiredString('name', { maxLength: 100 }),
	validateEnumString('accountType', ['CASH', 'BANK', 'CARD', 'EWALLET']),
	validateNonNegativeDecimal('openingBalance')
];

router.get('/', accountsController.getAccounts);
router.post('/', validateRequest(accountBodyValidators), accountsController.createAccount);
const accountUpdateValidators = [
	validateRequiredString('name', { maxLength: 100 }),
	validateEnumString('accountType', ['CASH', 'BANK', 'CARD', 'EWALLET']),
	validateNonNegativeDecimal('openingBalance')
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

module.exports = router;
