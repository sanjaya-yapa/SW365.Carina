const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/config/db');
const reports = require('../src/services/reports.service');
const app = require('../src/app');

const originalExecute = db.execute;
after(async () => {
  db.execute = originalExecute;
  await db.end();
});

test('groups expenses by category ID and sums decimal amounts exactly', async () => {
  db.execute = async (sql, params) => {
    assert.deepEqual(params, ['2026-09-01', '2026-10-01']);
    assert.match(sql, /c.category_type = 'EXPENSE'/);
    assert.match(sql, /t.txn_date >= \? AND t.txn_date < \?/);
    assert.doesNotMatch(sql, /is_active/);
    return [
      [
        {
          category_id: 1,
          category_name: 'Food',
          transaction_id: 1,
          txn_date: '2026-09-01',
          account_name: 'Cash',
          note: '<script>example</script>',
          is_regular: 1,
          amount: '0.10',
        },
        {
          category_id: 1,
          category_name: 'Food',
          transaction_id: 2,
          txn_date: '2026-09-02',
          account_name: 'Cash',
          note: null,
          amount: '0.20',
        },
        {
          category_id: 2,
          category_name: 'Travel',
          transaction_id: 3,
          txn_date: '2026-09-03',
          account_name: 'Savings',
          note: 'Bus',
          amount: '12.34',
        },
      ],
    ];
  };
  const report = await reports.getMonthlyExpenses(2026, 9);
  assert.equal(report.categories.length, 2);
  assert.equal(report.categories[0].expenses.length, 2);
  assert.equal(report.categories[0].expenses[0].description, '<script>example</script>');
  assert.equal(report.categories[0].expenses[1].description, 'Expense #2');
  assert.equal(report.categories[0].total, '0.30');
  assert.equal(report.categories[1].total, '12.34');
  assert.equal(report.grand_total, '12.64');
  assert.equal(report.categories[0].expenses[0].is_regular, true);
  assert.equal(report.categories[0].expenses[1].is_regular, false);
});

test('empty report and December rollover, including the supported upper year', async () => {
  db.execute = async (sql, params) => {
    assert.deepEqual(params, ['2100-12-01', '2101-01-01']);
    return [[]];
  };
  assert.deepEqual(await reports.getMonthlyExpenses(2100, 12), {
    year: 2100,
    month: 12,
    categories: [],
    grand_total: '0.00',
  });
});

test('HTTP endpoint validates inputs, returns a report and handles database errors', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    db.execute = async () => {
      throw new Error('Database must not be called');
    };
    for (const query of ['', '?year=2026&month=13', '?year=1999&month=1', '?year=2026&month=1.5']) {
      const response = await fetch(`${base}/api/reports/monthly-expenses${query}`);
      assert.equal(response.status, 400);
    }
    db.execute = async () => [[]];
    const response = await fetch(`${base}/api/reports/monthly-expenses?year=2024&month=2`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.success, true);
    assert.equal(payload.data.grand_total, '0.00');
    db.execute = async () => {
      throw new Error('private database details');
    };
    const failure = await fetch(`${base}/api/reports/monthly-expenses?year=2026&month=9`);
    assert.equal(failure.status, 500);
    assert.doesNotMatch(await failure.text(), /private database details/);
    const page = await fetch(`${base}/pages/reports.html`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /\/js\/reports.js/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('regular filter reaches SQL and totals include only matching expenses', async () => {
  const rows = [
    { category_id: 1, category_name: 'Food', amount: '10.10', is_regular: 1 },
    { category_id: 1, category_name: 'Food', amount: '20.20', is_regular: 0 },
    { category_id: 2, category_name: 'Travel', amount: '30.30', is_regular: 0 },
  ];
  let calls = 0;
  db.execute = async (sql, params) => {
    calls++;
    if (params.length === 2) {
      assert.doesNotMatch(sql, /AND t.is_regular = \?/);
      return [rows];
    }
    assert.match(sql, /AND t.is_regular = \?/);
    assert.equal(typeof params[2], 'boolean');
    return [rows.filter((row) => Boolean(row.is_regular) === params[2])];
  };
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/reports/monthly-expenses?year=2026&month=9`;
  try {
    for (const [filter, total, categoryCount, foodTotal] of [
      ['', '60.60', 2, '30.30'],
      ['&isRegular=true', '10.10', 1, '10.10'],
      ['&isRegular=false', '50.50', 2, '20.20'],
    ]) {
      const response = await fetch(base + filter);
      assert.equal(response.status, 200);
      const { data } = await response.json();
      assert.equal(data.grand_total, total);
      assert.equal(data.categories.length, categoryCount);
      assert.equal(data.categories[0].total, foodTotal);
    }
    const validCalls = calls;
    for (const filter of ['yes', '0', '', 'true&isRegular=false']) {
      const response = await fetch(`${base}&isRegular=${filter}`);
      assert.equal(response.status, 400);
    }
    assert.equal(calls, validCalls);
    db.execute = async () => [[]];
    const { data } = await (await fetch(`${base}&isRegular=true`)).json();
    assert.deepEqual(data.categories, []);
    assert.equal(data.grand_total, '0.00');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
