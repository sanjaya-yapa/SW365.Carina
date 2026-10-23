const service = require('../services/transaction-owners.service');
const { sendSuccess, sendError } = require('../utils/api-response');

function handle(action, message, status = 200) {
  return async (req, res) => {
    try {
      return sendSuccess(res, await action(req), message, status);
    } catch (error) {
      if (error.message === 'Transaction owner not found') {
        return sendError(res, error.message, null, 404);
      }
      console.error('Transaction owner request failed', error);
      return sendError(res, 'Internal server error', null, 500);
    }
  };
}

module.exports = {
  getOwners: handle(() => service.getOwners(), 'Transaction owners retrieved successfully'),
  createOwner: handle(
    (req) => service.createOwner(req.body),
    'Transaction owner created successfully',
    201
  ),
  updateOwner: handle(
    (req) => service.updateOwner(req.params.id, req.body),
    'Transaction owner updated successfully'
  ),
};
