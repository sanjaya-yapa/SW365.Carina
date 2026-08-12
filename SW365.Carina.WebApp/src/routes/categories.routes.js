const express = require('express');
const categoriesController = require('../controllers/categories.controller');
const {
  validateRequest,
  validatePositiveIntParam,
  validateRequiredString,
  validateEnumString,
} = require('../middleware/validate-request');

const router = express.Router();

const categoryBodyValidators = [
  validateRequiredString('name', { maxLength: 100 }),
  validateEnumString('categoryType', ['INCOME', 'EXPENSE', 'ASSET']),
];

router.get('/', categoriesController.getCategories);
router.get(
  '/:id',
  validateRequest(validatePositiveIntParam('id')),
  categoriesController.getCategoryById
);
router.post('/', validateRequest(categoryBodyValidators), categoriesController.createCategory);
router.put(
  '/:id',
  validateRequest([validatePositiveIntParam('id'), ...categoryBodyValidators]),
  categoriesController.updateCategory
);
router.patch(
  '/:id/deactivate',
  validateRequest(validatePositiveIntParam('id')),
  categoriesController.deactivateCategory
);
router.patch(
  '/:id/reactivate',
  validateRequest(validatePositiveIntParam('id')),
  categoriesController.reactivateCategory
);

module.exports = router;
