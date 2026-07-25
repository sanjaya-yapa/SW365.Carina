const express = require('express');
const { sendSuccess } = require('../utils/api-response');

const router = express.Router();
const accountsRouter = require('./accounts.routes');
const categoriesRouter = require('./categories.routes');
const budgetsRouter = require('./budgets.routes');
const transactionsRouter = require('./transactions.routes');
const bankImportsRouter = require('./bank-imports.routes');
const reportsRouter = require('./reports.routes');

router.get('/', (req, res) => {
  return sendSuccess(res, null, 'Personal Finance API root', 200);
});

router.use('/accounts', accountsRouter);
router.use('/categories', categoriesRouter);
router.use('/budgets', budgetsRouter);
router.use('/transactions', transactionsRouter);
router.use('/bank-imports', bankImportsRouter);
router.use('/reports', reportsRouter);

module.exports = router;
