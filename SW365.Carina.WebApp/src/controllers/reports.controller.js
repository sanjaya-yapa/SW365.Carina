const { sendSuccess, sendError } = require('../utils/api-response');
const reportsService = require('../services/reports.service');

function mapServiceError(err) {
  const rawMessage = err && err.message ? err.message : 'Request failed';
  const message = String(rawMessage);
  const lowered = message.toLowerCase();

  if (lowered.includes('not found')) {
    return { statusCode: 404, message: 'Data not found' };
  }

  if (err && (err.sqlState === '45000' || err.code === 'ER_SIGNAL_EXCEPTION')) {
    return { statusCode: 409, message: message };
  }

  return { statusCode: 500, message: 'Internal server error' };
}

/**
 * GET /api/reports/monthly-summary?year=&month=
 * Retrieve monthly summary (planned vs actual vs variance)
 */
async function getMonthSummary(req, res) {
  try {
    const { year, month } = req.query;
    console.log('🔍 DEBUG: Controller received query:', { year, month });

    const result = await reportsService.getMonthSummary(
      parseInt(year),
      parseInt(month)
    );
    console.log('✅ DEBUG: Controller received result from service:', result);

    return sendSuccess(res, result, 'Monthly summary retrieved successfully', 200);
  } catch (err) {
    const mapped = mapServiceError(err);
    return sendError(res, mapped.message, null, mapped.statusCode);
  }
}

/**
 * GET /api/reports/monthly-category-variance?year=&month=
 * Retrieve monthly category variance breakdown
 */
async function getMonthCategoryVariance(req, res) {
  try {
    const { year, month } = req.query;
    console.log('🔍 DEBUG: Controller received query:', { year, month });

    const result = await reportsService.getMonthCategoryVariance(
      parseInt(year),
      parseInt(month)
    );
    console.log('✅ DEBUG: Controller received result from service:', result);

    return sendSuccess(res, result, 'Monthly category variance retrieved successfully', 200);
  } catch (err) {
    const mapped = mapServiceError(err);
    return sendError(res, mapped.message, null, mapped.statusCode);
  }
}

/**
 * GET /api/reports/annual-expense-trend?year=
 * Retrieve annual expense trend for the year
 */
async function getAnnualExpenseTrend(req, res) {
  try {
    const { year } = req.query;
    console.log('🔍 DEBUG: Controller received query:', { year });

    const result = await reportsService.getAnnualExpenseTrend(parseInt(year));
    console.log('✅ DEBUG: Controller received result from service:', result);

    return sendSuccess(res, result, 'Annual expense trend retrieved successfully', 200);
  } catch (err) {
    const mapped = mapServiceError(err);
    return sendError(res, mapped.message, null, mapped.statusCode);
  }
}

module.exports = {
  getMonthSummary,
  getMonthCategoryVariance,
  getAnnualExpenseTrend
};
