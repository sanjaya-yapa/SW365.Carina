const { sendSuccess, sendError } = require('../utils/api-response');
const budgetsService = require('../services/budgets.service');

/**
 * Map database errors to user-friendly messages
 * This prevents exposing internal database errors to the frontend
 */
function mapServiceError(err) {
    const rawMessage = err && err.message ? err.message : 'Request failed';
    const message = String(rawMessage);
    const lowered = message.toLowerCase();

    // Duplicate budget plan for same year/month/category
    if (err && (err.code === 'ER_DUP_ENTRY' || lowered.includes('duplicate'))) {
        return {
          statusCode: 400,
          message: 'Budget plan already exists for this month and category'
        };
    }

    // Category doesn't exist (foreign key violation)
    if (lowered.includes('not found') || lowered.includes('foreign key')) {
        return {
            statusCode: 404,
            message: 'Category not found'
        };
    }

    // MySQL SIGNAL SQLSTATE errors(custom errors from stored procedures)
    if (err && (err.sqlState === '45000' || err.code === 'ER_SIGNAL_EXCEPTION')) {
        return {
            statusCode: 400,
            message: message
        };
    }

    // Catch-all for unhandled errors
    return {
        statusCode: 500,
        message: 'Internal server error'
    };
}

/**
 * GET /api/budgets?year=2025&month=6
 * Fetch all budget plans for a specific month
 */
async function getBudgetPlanByMonth(req, res) {
    try {
        const { year, month } = req.query;
        const plans = await budgetsService.getBudgetPlanByMonth(year, month);
        return sendSuccess(res, plans, 'Budget plans retrieved successfully', 200);
    } catch (err) {
        const mapped = mapServiceError(err);
        return sendError(res, mapped.message, null, mapped.statusCode);
    }
}

/**
 * POST /api/budgets/upsert
 * Create or update a budget plan
 *
 * Request body:
 * {
 *   year: 2025,
 *   month: 6,
 *   categoryId: "CAT_FOOD",
 *   plannedAmount: 300.50
 * }
 */
async function upsertBudgetPlan(req, res){
    try{
        const { year, month, categoryId, plannedAmount, note } = req.body;
        console.log('🔍 DEBUG: Controller received body:', { year, month, categoryId, plannedAmount, note });

        // Call service to create/update the budget plan
        const result = await budgetsService.upsertBudgetPlan(
            year, 
            month, 
            categoryId, 
            plannedAmount,
            note || null
        );
        console.log('✅ DEBUG: Controller received result from service:', result);
        // Determine if this was new insert (201) or update (200)
        // For now, we'll return 201 (you can enhance this based on your stored procedure)
        return sendSuccess(res, result, 'Budget plan upserted successfully', 201);
    } catch (err){
        const mapped = mapServiceError(err);
        return sendError(res, mapped.message, null, mapped.statusCode);
    }
}

module.exports = {
    getBudgetPlanByMonth,
    upsertBudgetPlan
};
