const express = require('express');
const reportsController = require('../controllers/reports.controller');
const { validateRequest, validatePositiveIntRange } = require('../middleware/validate-request');

const router = express.Router();

// Validators for query parameters
const monthlyReportValidators = [
  validatePositiveIntRange('year', 2000, 2100, { source: 'query' }),
  validatePositiveIntRange('month', 1, 12, { source: 'query' })
];

const annualTrendValidators = [validatePositiveIntRange('year', 2000, 2100, { source: 'query' })];

// GET /api/reports/monthly-summary?year=2025&month=6
router.get('/', validateRequest(monthlyReportValidators), reportsController.getMonthSummary);

// GET /api/reports/monthly-category-variance?year=2025&month=6
router.get(
  '/category-variance',
  validateRequest(monthlyReportValidators),
  reportsController.getMonthCategoryVariance
);

// GET /api/reports/annual-trend?year=2025
router.get('/annual-trend', validateRequest(annualTrendValidators), reportsController.getAnnualExpenseTrend);

module.exports = router;
