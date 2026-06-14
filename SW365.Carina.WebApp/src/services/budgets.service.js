const db = require('../config/db');

/**
 * Helper: Get the appropriate database execute function
 * Handles different mysql2 configurations (direct execute or pool.execute)
 */
function getExecute(){
    if(db && typeof db.execute === 'function'){
        return db.execute.bind(db); 
    }

    if(db && db.pool && typeof db.pool.execute === 'function'){
        return db.pool.execute.bind(db.pool);
    }

    throw new Error('Database executer is not configured');
}

/**
 * Helper: Unwrap stored procedure result rows
 * MySQL returns results in different formats depending on the library version
 */
function unwrapProcedureRows(resultRows){
    if(!Array.isArray(resultRows)){
        return [];
    }

        // Some libraries wrap results in an extra array
    if (Array.isArray(resultRows[0])) {
        return resultRows[0];
    }

    return resultRows;
}

/**
 * Get all budget plans for a specific month
 * @param {number} year - Budget year (e.g., 2025)
 * @param {number} month - Budget month (1-12)
 * @returns {Promise<Array>} Array of budget plan objects
 */
async function getBudgetPlanByMonth(year, month) {
	try {
		console.log('🔍 DEBUG: getBudgetPlanByMonth called with:', { year, month });
		const execute = getExecute();
		console.log('✅ DEBUG: Database executor obtained');
		
		const [rows] = await execute('CALL sp_get_budget_plan_by_month(?, ?)', [year, month]);
		console.log('✅ DEBUG: Stored procedure returned:', rows);
		
		const result = unwrapProcedureRows(rows);
		console.log('✅ DEBUG: Unwrapped rows:', result);
		return result;
	} catch (err) {
		console.error('❌ DEBUG: getBudgetPlanByMonth error:', {
			message: err.message,
			code: err.code,
			sqlState: err.sqlState,
			stack: err.stack
		});
		throw err;
	}
}

/**
 * Create or update a budget plan (upsert)
 * If a plan for (year, month, categoryId) exists, update it
 * Otherwise, create a new plan
 * @param {number} year
 * @param {number} month
 * @param {string} categoryId
 * @param {number} plannedAmount
 * @param {string} note - Optional note about the budget plan
 * @returns {Promise<Object>} The created/updated budget plan record
 */
async function upsertBudgetPlan(year, month, categoryId, plannedAmount, note = null) {
    try {
        console.log('🔍 DEBUG: upsertBudgetPlan called with:', { year, month, categoryId, plannedAmount, note });
        const execute = getExecute();
        console.log('✅ DEBUG: Database executor obtained');
        
        console.log('🔍 DEBUG: Calling sp_upsert_budget_plan with params:', [year, month, categoryId, plannedAmount, note]);
        const [rows] = await execute(
            'CALL sp_upsert_budget_plan(?, ?, ?, ?, ?)',
            [year, month, categoryId, plannedAmount, note]
        );
        console.log('✅ DEBUG: Stored procedure returned:', rows);
        
        const data = unwrapProcedureRows(rows);
        console.log('✅ DEBUG: Unwrapped data:', data);
        
        return data[0] || null;
    } catch (err) {
        console.error('❌ DEBUG: upsertBudgetPlan error:', {
            message: err.message,
            code: err.code,
            sqlState: err.sqlState,
            stack: err.stack
        });
        throw err;
    }
}

module.exports = {
    getBudgetPlanByMonth,
    upsertBudgetPlan
};

