const express = require('express');
const bankImportsController = require('../controllers/bank-imports.controller');
const {
  validateRequest,
  validatePositiveIntParam,
  validatePositiveIntRange,
  validateOptionalBoolean,
} = require('../middleware/validate-request');

const router = express.Router();

const completeImportValidators = [
  validatePositiveIntRange('accountId', 1, Number.MAX_SAFE_INTEGER),
  validatePositiveIntRange('categoryId', 1, Number.MAX_SAFE_INTEGER),
  validateOptionalBoolean('isTaxClaimable', { defaultValue: false }),
];

router.get('/', bankImportsController.getImports);
router.post('/', bankImportsController.importRows);
router.delete('/', bankImportsController.deleteImports);
router.get(
  '/:id',
  validateRequest(validatePositiveIntParam('id')),
  bankImportsController.getImportById
);
router.post(
  '/:id/complete',
  validateRequest([validatePositiveIntParam('id'), ...completeImportValidators]),
  bankImportsController.completeImport
);
router.delete(
  '/:id',
  validateRequest(validatePositiveIntParam('id')),
  bankImportsController.deleteImport
);

module.exports = router;
