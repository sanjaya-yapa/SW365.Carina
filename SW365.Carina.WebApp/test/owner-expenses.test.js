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

const expense = {
  txn_date: '2026-10-01',
  account_name: 'Cash',
  category_name: 'Food',
  is_regular: 0,
};
const rows = [
  { ...expense, transaction_id: 1, owner_id: null, owner_full_name: null, amount: '4.00' },
  { ...expense, transaction_id: 2, owner_id: 1, owner_full_name: '<Alex Smith>', amount: '0.10' },
  {
    ...expense,
    transaction_id: 3,
    owner_id: 1,
    owner_full_name: '<Alex Smith>',
    amount: '0.20',
    is_regular: 1,
  },
  { ...expense, transaction_id: 4, owner_id: 2, owner_full_name: '<Alex Smith>', amount: '10.00' },
];

test('owner grouping preserves unassigned and same-name owners with exact totals', async () => {
  db.execute = async (sql, params) => {
    assert.deepEqual(params, ['2026-10-01', '2026-11-01']);
    assert.match(sql, /LEFT JOIN transaction_owners o ON o.owner_id = t.owner_id/);
    assert.match(sql, /c.category_type = 'EXPENSE'/);
    assert.match(sql, /t.txn_date >= \? AND t.txn_date < \?/);
    assert.match(sql, /ORDER BY o.full_name, t.owner_id, t.txn_date, t.transaction_id/);
    assert.doesNotMatch(sql, /is_active|bank_imports/);
    return [rows];
  };
  const report = await reports.getOwnerExpenses(2026, 10);
  assert.equal(report.owners.length, 3);
  assert.deepEqual(
    report.owners.map((owner) => owner.total),
    ['4.00', '0.30', '10.00']
  );
  assert.equal(report.owners[0].owner_id, null);
  assert.equal(report.owners[0].owner_name, 'Unassigned');
  assert.equal(report.owners[1].owner_name, '<Alex Smith>');
  assert.equal(report.owners[1].expenses.length, 2);
  assert.equal(report.owners[1].expenses[0].category_name, 'Food');
  assert.equal(report.owners[1].expenses[0].description, 'Expense #2');
  assert.equal(report.owners[1].expenses[1].is_regular, true);
  assert.equal(report.grand_total, '14.30');
});

test('owner endpoint validates filters, passes regular flags, and handles empty months and failures', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const endpoint = `${base}/api/reports/owner-expenses`;
  try {
    db.execute = async () => {
      assert.fail('Invalid input must not query the database');
    };
    for (const query of [
      '',
      '?year=1999&month=1',
      '?year=2101&month=1',
      '?year=2026&month=13',
      '?year=2026&month=1.5',
      '?year=2026&month=10&isRegular=yes',
      '?year=2026&month=10&isRegular=true&isRegular=false',
    ]) {
      assert.equal((await fetch(endpoint + query)).status, 400);
    }
    for (const [filter, flag, total] of [
      ['', null, '14.30'],
      ['&isRegular=true', true, '0.20'],
      ['&isRegular=false', false, '14.10'],
    ]) {
      db.execute = async (sql, params) => {
        assert.deepEqual(
          params,
          flag === null ? ['2026-10-01', '2026-11-01'] : ['2026-10-01', '2026-11-01', flag]
        );
        if (flag !== null) assert.match(sql, /AND t.is_regular = \?/);
        return [rows.filter((row) => flag === null || Boolean(row.is_regular) === flag)];
      };
      const response = await fetch(`${endpoint}?year=2026&month=10${filter}`);
      assert.equal(response.status, 200);
      const payload = await response.json();
      assert.equal(payload.success, true);
      assert.equal(payload.data.grand_total, total);
    }
    db.execute = async (sql, params) => {
      assert.deepEqual(params, ['2100-12-01', '2101-01-01']);
      return [[]];
    };
    const empty = await (await fetch(`${endpoint}?year=2100&month=12`)).json();
    assert.deepEqual(empty.data, { year: 2100, month: 12, owners: [], grand_total: '0.00' });
    db.execute = async () => {
      throw new Error('private database details');
    };
    const failure = await fetch(`${endpoint}?year=2026&month=10`);
    assert.equal(failure.status, 500);
    assert.doesNotMatch(await failure.text(), /private database details/);
    const page = await fetch(`${base}/pages/owner-expenses.html`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /\/js\/owner-spending.js/);
    assert.match(
      await (await fetch(`${base}/pages/reports.html`)).text(),
      /\/pages\/owner-expenses.html/
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test(
  'MySQL owner report includes only matching expenses and reflects owner changes',
  {
    skip: process.env.TRANSACTION_OWNER_DB_TEST !== '1',
  },
  async () => {
    require('dotenv').config({ quiet: true });
    const mysql = require('mysql2/promise');
    const fs = require('node:fs');
    const path = require('node:path');
    const database = `carina_owner_report_test_${process.pid}_${Date.now()}`;
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      multipleStatements: true,
      dateStrings: true,
    });
    try {
      const schema = fs
        .readFileSync(path.join(__dirname, '../sql/schema.sql'), 'utf8')
        .replaceAll('personal_finance', database);
      await connection.query(schema);
      await connection.query(`
      INSERT INTO accounts (account_name, is_active) VALUES ('Inactive cash', 0);
      INSERT INTO categories (category_name, category_type, is_active)
        VALUES ('Food', 'EXPENSE', 0), ('Salary', 'INCOME', 1), ('Assets', 'ASSET', 1);
      INSERT INTO transaction_owners (first_name, last_name)
        VALUES ('Alex', 'Smith'), ('Alex', 'Smith');
      INSERT INTO transactions (txn_date, account_id, category_id, owner_id, amount, is_regular)
        VALUES ('2026-10-01', 1, 1, NULL, 4.00, 0),
               ('2026-10-02', 1, 1, 1, 0.10, 0),
               ('2026-10-31', 1, 1, 1, 0.20, 1),
               ('2026-10-02', 1, 1, 2, 10.00, 0),
               ('2026-09-30', 1, 1, 1, 20.00, 0),
               ('2026-11-01', 1, 1, 1, 30.00, 0),
               ('2026-10-01', 1, 2, 1, 100.00, 0),
               ('2026-10-01', 1, 3, 1, 200.00, 0);
    `);
      db.execute = connection.execute.bind(connection);
      const report = await reports.getOwnerExpenses(2026, 10);
      assert.equal(report.owners.length, 3);
      assert.equal(report.grand_total, '14.30');
      assert.deepEqual(
        report.owners.map((owner) => owner.total),
        ['4.00', '0.30', '10.00']
      );
      assert.equal(report.owners[1].expenses[0].date, '2026-10-02');
      assert.equal((await reports.getOwnerExpenses(2026, 10, true)).grand_total, '0.20');
      assert.equal((await reports.getOwnerExpenses(2026, 10, false)).grand_total, '14.10');
      await connection.query(
        "UPDATE transaction_owners SET first_name = 'Renamed' WHERE owner_id = 1"
      );
      await connection.query('UPDATE transactions SET owner_id = 2 WHERE transaction_id = 2');
      const changed = await reports.getOwnerExpenses(2026, 10);
      assert.equal(
        changed.owners.find((owner) => owner.owner_id === 1).owner_name,
        'Renamed Smith'
      );
      assert.equal(changed.owners.find((owner) => owner.owner_id === 2).total, '10.10');
      assert.equal(changed.grand_total, '14.30');
    } finally {
      db.execute = originalExecute;
      await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
      await connection.end();
    }
  }
);
