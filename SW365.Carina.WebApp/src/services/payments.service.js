const db = require('../config/db');
const { frequencies, validDate, dueDates } = require('./payment-dates');

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
function id(value) {
  if (!Number.isSafeInteger(Number(value)) || Number(value) <= 0) fail('Invalid ID');
  return Number(value);
}
function validateSchedule(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 100) fail('Payment name must contain 1 to 100 characters');
  const amount = String(body.amount);
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0)
    fail('Enter a positive amount with up to two decimal places');
  if (!frequencies.includes(body.frequency)) fail('Invalid payment frequency');
  if (!validDate(body.startDate)) fail('Enter a valid next due date between 2000 and 2100');
  const end = body.endDate || null;
  if (end && (!validDate(end) || end < body.startDate))
    fail('End date must be on or after the next due date');
  return [
    name,
    amount,
    id(body.accountId),
    id(body.categoryId),
    body.frequency,
    body.startDate,
    end,
  ];
}
async function schedules() {
  const [rows] =
    await db.execute(`SELECT s.*, a.account_name, c.category_name FROM payment_schedules s
    JOIN accounts a ON a.account_id = s.account_id JOIN categories c ON c.category_id = s.category_id
    ORDER BY s.name, s.schedule_id`);
  return rows;
}
async function create(body) {
  const values = validateSchedule(body);
  const [result] = await db.execute(
    `INSERT INTO payment_schedules (name,amount,account_id,category_id,frequency,start_date,end_date)
    SELECT ?, ?, a.account_id, c.category_id, ?, ?, ? FROM accounts a CROSS JOIN categories c
    WHERE a.account_id = ? AND a.is_active = 1 AND c.category_id = ? AND c.is_active = 1 AND c.category_type = 'EXPENSE'`,
    [values[0], values[1], values[4], values[5], values[6], values[2], values[3]]
  );
  if (!result.affectedRows) fail('Select an active account and expense category');
  return { scheduleId: result.insertId };
}
async function calendar(from, to, today) {
  if (
    ![from, to, today].every(validDate) ||
    from > to ||
    (new Date(to) - new Date(from)) / 86400000 > 366
  )
    fail('Provide a valid date range of at most 367 days and today');
  const list = await schedules();
  const [exceptions] = await db.execute(
    `SELECT o.*, t.amount AS actual_amount FROM payment_occurrences o
    LEFT JOIN transactions t ON t.transaction_id = o.transaction_id WHERE o.due_date BETWEEN ? AND ?`,
    [from, to]
  );
  const lookup = new Map(exceptions.map((row) => [`${row.schedule_id}/${row.due_date}`, row]));
  return list
    .flatMap((schedule) =>
      dueDates(schedule, from, to).map((date) => {
        const occurrence = lookup.get(`${schedule.schedule_id}/${date}`);
        return {
          ...schedule,
          due_date: date,
          transaction_id: occurrence?.transaction_id || null,
          actual_amount: occurrence?.actual_amount || null,
          status: occurrence?.transaction_id
            ? 'PAID'
            : Number(occurrence?.is_skipped) === 1
              ? 'SKIPPED'
              : date < today
                ? 'OVERDUE'
                : 'UPCOMING',
        };
      })
    )
    .sort((a, b) => a.due_date.localeCompare(b.due_date) || a.name.localeCompare(b.name));
}
async function changeOccurrence(scheduleId, date, body) {
  scheduleId = id(scheduleId);
  if (!validDate(date)) fail('Invalid due date');
  if (!['link', 'skip', 'reset'].includes(body.action)) fail('Invalid payment action');
  const transactionId = body.action === 'link' ? id(body.transactionId) : null;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [[schedule]] = await connection.execute(
      'SELECT * FROM payment_schedules WHERE schedule_id = ? FOR UPDATE',
      [scheduleId]
    );
    if (!schedule) fail('Payment schedule not found', 404);
    if (!dueDates(schedule, date, date).length) fail('This date is not a scheduled occurrence');
    const [[existing]] = await connection.execute(
      'SELECT * FROM payment_occurrences WHERE schedule_id = ? AND due_date = ? FOR UPDATE',
      [scheduleId, date]
    );
    if (existing?.transaction_id && body.action !== 'reset')
      fail('Unlink the existing transaction first', 409);
    if (transactionId) {
      const [[transaction]] = await connection.execute(
        `SELECT t.*, c.category_type FROM transactions t
        JOIN categories c ON c.category_id = t.category_id WHERE t.transaction_id = ? FOR UPDATE`,
        [transactionId]
      );
      if (
        !transaction ||
        transaction.category_type !== 'EXPENSE' ||
        String(transaction.account_id) !== String(schedule.account_id) ||
        String(transaction.category_id) !== String(schedule.category_id)
      )
        fail('Choose an expense transaction with the same account and category');
    }
    await connection.execute(
      `INSERT INTO payment_occurrences (schedule_id,due_date,transaction_id,is_skipped) VALUES (?,?,?,?)
      ON DUPLICATE KEY UPDATE transaction_id=VALUES(transaction_id), is_skipped=VALUES(is_skipped)`,
      [scheduleId, date, transactionId, body.action === 'skip']
    );
    await connection.commit();
    return { updated: true };
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY')
      fail('This transaction is already linked to a scheduled payment', 409);
    throw error;
  } finally {
    connection.release();
  }
}
async function endSchedule(scheduleId, endDate) {
  scheduleId = id(scheduleId);
  if (!validDate(endDate)) fail('Enter a valid final due date');
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [[schedule]] = await connection.execute(
      'SELECT * FROM payment_schedules WHERE schedule_id=? FOR UPDATE',
      [scheduleId]
    );
    if (!schedule) fail('Payment schedule not found', 404);
    if (endDate < schedule.start_date) fail('End date must be on or after the first due date');
    const [linked] = await connection.execute(
      'SELECT due_date FROM payment_occurrences WHERE schedule_id=? AND due_date>? AND transaction_id IS NOT NULL',
      [scheduleId, endDate]
    );
    if (linked.length) fail('Unlink paid occurrences after this end date first', 409);
    await connection.execute('UPDATE payment_schedules SET end_date=? WHERE schedule_id=?', [
      endDate,
      scheduleId,
    ]);
    await connection.commit();
    return { updated: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
module.exports = { schedules, create, calendar, changeOccurrence, endSchedule, validateSchedule };
