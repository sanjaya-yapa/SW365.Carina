const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { dueDates, validDate } = require('../src/services/payment-dates');
const service = require('../src/services/payments.service');
const db = require('../src/config/db');
const app = require('../src/app');
const originalExecute = db.execute;
const originalConnection = db.getConnection;
after(async () => {
  db.execute = originalExecute;
  db.getConnection = originalConnection;
  await db.end();
});
const schedule = {
  schedule_id: 1,
  name: 'Power',
  amount: '10.00',
  account_id: 2,
  category_id: 3,
  start_date: '2024-01-31',
  end_date: null,
  frequency: 'MONTHLY',
};

test('monthly recurrence clamps short months without drifting the anchor', () => {
  assert.deepEqual(dueDates(schedule, '2024-01-01', '2024-04-30'), [
    '2024-01-31',
    '2024-02-29',
    '2024-03-31',
    '2024-04-30',
  ]);
  assert.deepEqual(dueDates({ ...schedule, end_date: '2024-02-29' }, '2024-01-01', '2024-12-31'), [
    '2024-01-31',
    '2024-02-29',
  ]);
  assert.equal(validDate('2026-02-30'), false);
  assert.equal(validDate('2024-02-29'), true);
  assert.equal(validDate('1999-12-31'), false);
});
test('weekly, fortnightly, quarterly and leap-year annual recurrences', () => {
  assert.deepEqual(dueDates({ ...schedule, frequency: 'WEEKLY' }, '2024-02-01', '2024-02-15'), [
    '2024-02-07',
    '2024-02-14',
  ]);
  assert.deepEqual(
    dueDates({ ...schedule, frequency: 'FORTNIGHTLY' }, '2024-02-01', '2024-02-29'),
    ['2024-02-14', '2024-02-28']
  );
  assert.deepEqual(dueDates({ ...schedule, frequency: 'QUARTERLY' }, '2024-02-01', '2024-08-01'), [
    '2024-04-30',
    '2024-07-31',
  ]);
  assert.deepEqual(
    dueDates(
      { ...schedule, start_date: '2024-02-29', frequency: 'YEARLY' },
      '2025-01-01',
      '2028-12-31'
    ),
    ['2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29']
  );
});
test('schedule validation rejects invalid amount, date, frequency, references and end date', () => {
  const good = {
    name: 'Power',
    amount: '12.30',
    accountId: 2,
    categoryId: 3,
    frequency: 'MONTHLY',
    startDate: '2026-10-31',
  };
  assert.equal(service.validateSchedule(good)[1], '12.30');
  for (const patch of [
    { amount: '0' },
    { amount: '1.234' },
    { amount: '-1' },
    { name: ' ' },
    { accountId: 0 },
    { categoryId: 1.2 },
    { frequency: 'DAILY' },
    { startDate: '2026-02-30' },
    { endDate: '2026-10-01' },
  ])
    assert.throws(() => service.validateSchedule({ ...good, ...patch }));
});
test('calendar computes statuses and does not create actual transactions', async () => {
  db.execute = async (sql) =>
    sql.includes('FROM payment_schedules')
      ? [[schedule]]
      : [
          [
            { schedule_id: 1, due_date: '2024-01-31', transaction_id: 8, actual_amount: '11.00' },
            { schedule_id: 1, due_date: '2024-02-29', is_skipped: 1 },
            { schedule_id: 1, due_date: '2024-03-31', transaction_id: null, is_skipped: 0 },
          ],
        ];
  const rows = await service.calendar('2024-01-01', '2024-04-30', '2024-04-30');
  assert.deepEqual(
    rows.map((row) => row.status),
    ['PAID', 'SKIPPED', 'OVERDUE', 'UPCOMING']
  );
  assert.equal(rows[0].actual_amount, '11.00');
  await assert.rejects(service.calendar('2024-01-01', '2026-01-01', '2024-01-01'));
});

function mockConnection({ transaction, existing, duplicate = false, linked = [] } = {}) {
  const calls = [];
  let committed = false;
  let rolledBack = false;
  let released = false;
  db.getConnection = async () => ({
    beginTransaction: async () => {},
    commit: async () => {
      committed = true;
    },
    rollback: async () => {
      rolledBack = true;
    },
    release: () => {
      released = true;
    },
    execute: async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes('FROM payment_schedules')) return [[schedule]];
      if (sql.includes('SELECT due_date')) return [linked];
      if (sql.includes('FROM payment_occurrences')) return [existing ? [existing] : []];
      if (sql.includes('FROM transactions')) return [transaction ? [transaction] : []];
      if (duplicate) {
        const error = new Error('Duplicate');
        error.code = 'ER_DUP_ENTRY';
        throw error;
      }
      return [{ affectedRows: 1 }];
    },
  });
  return { calls, state: () => ({ committed, rolledBack, released }) };
}
test('linking locks and validates the transaction, records only the association, and commits', async () => {
  const mock = mockConnection({
    transaction: { transaction_id: 8, account_id: 2, category_id: 3, category_type: 'EXPENSE' },
  });
  await service.changeOccurrence(1, '2024-01-31', { action: 'link', transactionId: 8 });
  assert.deepEqual(mock.state(), { committed: true, rolledBack: false, released: true });
  assert.ok(mock.calls.some((call) => call.sql.includes('FOR UPDATE')));
  assert.ok(mock.calls.some((call) => call.sql.includes('INSERT INTO payment_occurrences')));
  assert.ok(
    mock.calls.every((call) => !/(INSERT INTO|UPDATE|DELETE FROM) transactions/.test(call.sql))
  );
});
test('wrong category, duplicate links, already paid and invalid occurrence roll back', async () => {
  for (const [options, date] of [
    [{ transaction: { account_id: 2, category_id: 4, category_type: 'EXPENSE' } }, '2024-01-31'],
    [
      { transaction: { account_id: 2, category_id: 3, category_type: 'EXPENSE' }, duplicate: true },
      '2024-01-31',
    ],
    [{ existing: { transaction_id: 9 } }, '2024-01-31'],
    [{}, '2024-01-30'],
  ]) {
    const mock = mockConnection(options);
    await assert.rejects(service.changeOccurrence(1, date, { action: 'link', transactionId: 8 }));
    assert.deepEqual(mock.state(), { committed: false, rolledBack: true, released: true });
  }
});
test('skip and reset keep expense records intact, end date protects linked history', async () => {
  for (const action of ['skip', 'reset']) {
    const mock = mockConnection();
    await service.changeOccurrence(1, '2024-01-31', { action });
    assert.deepEqual(mock.calls.at(-1).params, [1, '2024-01-31', null, action === 'skip']);
  }
  const mock = mockConnection({ linked: [{ due_date: '2024-03-31' }] });
  await assert.rejects(service.endSchedule(1, '2024-02-29'), /Unlink paid/);
  assert.equal(mock.state().rolledBack, true);
});
test('payment routes serve UI, validate API requests and mask internal errors', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const invalid = await fetch(base + '/api/payments/calendar?from=bad');
    assert.equal(invalid.status, 400);
    const create = await fetch(base + '/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(create.status, 400);
    db.execute = async () => {
      throw new Error('Private database detail');
    };
    const failed = await fetch(base + '/api/payments');
    assert.equal(failed.status, 500);
    assert.doesNotMatch(await failed.text(), /Private/);
    const page = await fetch(base + '/pages/payments.html');
    assert.equal(page.status, 200);
    assert.match(await page.text(), /\/js\/payments.js/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
