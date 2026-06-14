const { sendSuccess, sendError } = require('../utils/api-response');
const accountsService = require('../services/accounts.service');

function mapServiceError(err) {
	const rawMessage = err && err.message ? err.message : 'Request failed';
	const message = String(rawMessage);
	const lowered = message.toLowerCase();

	if (err && err.code === 'ER_DUP_ENTRY') {
		return { statusCode: 409, message: 'Account already exists' };
	}

	if (lowered.includes('not found')) {
		return { statusCode: 404, message: 'Account not found' };
	}

	if (lowered.includes('in use') || lowered.includes('reference') || lowered.includes('cannot')) {
		return {
			statusCode: 409,
			message: 'Account cannot be deactivated because it is referenced by transactions'
		};
	}

	if (err && (err.sqlState === '45000' || err.code === 'ER_SIGNAL_EXCEPTION')) {
		return { statusCode: 409, message: message };
	}

	return { statusCode: 500, message: 'Internal server error' };
}

async function getAccounts(req, res) {
	try {
		const accounts = await accountsService.getAccounts();
		return sendSuccess(res, accounts, 'Accounts retrieved successfully', 200);
	} catch (err) {
		const mapped = mapServiceError(err);
		return sendError(res, mapped.message, null, mapped.statusCode);
	}
}

async function createAccount(req, res) {
	try {
		const { name, accountType, openingBalance } = req.body;
		const created = await accountsService.addAccount(name, accountType, openingBalance || 0);

		return sendSuccess(res, created, 'Account created successfully', 201);
	} catch (err) {
		const mapped = mapServiceError(err);
		return sendError(res, mapped.message, null, mapped.statusCode);
	}
}

async function updateAccount(req, res) {
	try {
		const { id } = req.params;
		const { name, accountType, openingBalance } = req.body;

		const updated = await accountsService.updateAccount(id, name, accountType, openingBalance || 0);
		return sendSuccess(res, updated, 'Account updated successfully', 200);
	} catch (err) {
		const mapped = mapServiceError(err);
		return sendError(res, mapped.message, null, mapped.statusCode);
	}
}

async function deactivateAccount(req, res) {
	try {
		const { id } = req.params;
		const result = await accountsService.deactivateAccount(id);

		return sendSuccess(res, result, 'Account deactivated successfully', 200);
	} catch (err) {
		const mapped = mapServiceError(err);
		return sendError(res, mapped.message, null, mapped.statusCode);
	}
}

module.exports = {
	getAccounts,
	createAccount,
	updateAccount,
	deactivateAccount
};
