const express = require('express');
const accountsController = require('../controllers/accounts.controller');
const {
	validateRequest,
	validatePositiveIntParam,
	validateRequiredString,
	validateEnumString
} = require('../middleware/validate-request');

const router = express.Router();

const accountBodyValidators = [
	validateRequiredString('name', { maxLength: 100 }),
	validateEnumString('accountType', ['CASH', 'BANK', 'CARD', 'EWALLET'])
];

router.get('/', accountsController.getAccounts);
router.post('/', validateRequest(accountBodyValidators), accountsController.createAccount);
router.put(
	'/:id',
	validateRequest([validatePositiveIntParam('id'), ...accountBodyValidators]),
	accountsController.updateAccount
);
router.patch(
	'/:id/deactivate',
	validateRequest(validatePositiveIntParam('id')),
	accountsController.deactivateAccount
);

module.exports = router;
