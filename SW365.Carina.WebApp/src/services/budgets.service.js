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
    const execute = getExecute();
    const [rows] = await execute('CALL sp_get_budget_plan_by_month(?, ?)', [year, month]);
    return unwrapProcedureRows(rows);
}

/**
 * Create or update a budget plan (upsert)
 * If a plan for (year, month, categoryId) exists, update it
 * Otherwise, create a new plan
 * @param {number} year
 * @param {number} month
 * @param {string} categoryId
 * @param {number} plannedAmount
 * @returns {Promise<Object>} The created/updated budget plan record
 */
async function upsertBudgetPlan(year, month, categoryId, plannedAmount) {
    const execute = getExecute();
    const [rows] = await execute(
        'CALL sp_upsert_budget_plan(?, ?, ?, ?)',
        [year, month, categoryId, plannedAmount]
    );
    const data = unwrapProcedureRows(rows);
    return data[0] || null;
}

module.exports = {
    getBudgetPlanByMonth,
    upsertBudgetPlan
};

