const express = require('express');
const budgetsController = require('../controllers/budgets.controller');
const {
    validateRequest,
    validatePositiveIntRange,
    validatePositiveDecimal,
    validateRequiredString
} = require('../middleware/validate-request');

const router = express.Router();

/**
 * Validators for budget plan creation/update
 */

const budgetBodyValidators = [
    validatePositiveIntRange('year', 2000, 2100), // Year between 2000-2100
    validatePositiveIntRange('month', 1, 12),      // Month between 1-12
    validateRequiredString('categoryId', { maxLength: 50 }), // Must be a valid category ID
    validatePositiveDecimal('plannedAmount')       // Must be positive decimal
];

/**
 * GET /api/budgets?year=2025&month=6
 * Fetch all budget plans for a month
 * Validation: query params are converted to integers by validateRequest
 */
router.get('/', budgetsController.getBudgetPlanByMonth);

/**
 * POST /api/budgets/upsert
 * Create or update a budget plan
 * Validation happens before controller is called
 */
router.post(
    '/upsert',
    validateRequest(budgetBodyValidators),
    budgetsController.upsertBudgetPlan
);

module.exports = router;
