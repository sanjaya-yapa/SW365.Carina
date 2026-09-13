const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/config/db');
const app = require('../src/app');
const imports = require('../src/services/bank-imports.service');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const originalExecute = db.execute;
const originalGetConnection = db.getConnection;
after(async () => {
  db.execute = originalExecute;
  db.getConnection = originalGetConnection;
  await db.end();
});

test('create and edit pass Yes/No to persistence; missing defaults to No; invalid values fail', async () => {
  const calls = [];
  db.execute = async (sql, params) => {
    calls.push({ sql, params });
    return [[[{ transactionId: 1, affectedRows: 1 }]]];
  };
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/transactions`;
  try {
    for (const method of ['POST', 'PUT']) {
      for (const value of [true, false, undefined]) {
        const response = await fetch(method === 'POST' ? base : `${base}/1`, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            txnDate: '2026-09-13',
            accountId: 1,
            categoryId: 2,
            amount: 10,
            isRegular: value,
          }),
        });
        assert.equal(response.status, method === 'POST' ? 201 : 200);
        const call = calls.at(-1);
        assert.match(
          call.sql,
          method === 'POST' ? /sp_add_transaction_regular/ : /sp_update_transaction_regular/
        );
        assert.equal(call.params.at(-1), value ?? false);
        assert.equal(call.params.length, method === 'POST' ? 7 : 8);
      }
    }
    for (const value of ['Yes', 'false', 1, null]) {
      const count = calls.length;
      const response = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txnDate: '2026-09-13',
          accountId: 1,
          categoryId: 2,
          amount: 10,
          isRegular: value,
        }),
      });
      assert.equal(response.status, 400);
      assert.equal(calls.length, count);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('bank expense import passes the regular flag within its transaction', async () => {
  db.execute = async (sql) => {
    if (sql.includes('FROM categories')) return [[{ category_type: 'EXPENSE' }]];
    return [
      [
        {
          import_id: 1,
          status: 'PENDING',
          signed_amount: '-12.00',
          amount: '12.00',
          txn_date: '2026-09-13',
          description: 'Subscription',
        },
      ],
    ];
  };
  const calls = [];
  let committed = false;
  let released = false;
  db.getConnection = async () => ({
    beginTransaction: async () => {},
    execute: async (sql, params) => {
      calls.push({ sql, params });
      return [[[{ transactionId: 7 }]]];
    },
    commit: async () => {
      committed = true;
    },
    rollback: async () => {
      assert.fail('Unexpected rollback');
    },
    release: () => {
      released = true;
    },
  });
  await imports.completeImport(1, 1, 2, false, true);
  assert.match(calls[0].sql, /sp_add_transaction_regular/);
  assert.equal(calls[0].params.at(-1), true);
  assert.equal(committed, true);
  assert.equal(released, true);
});

test('edit form restores saved Yes and clears/disables it for non-expense categories', async () => {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, { value: '', checked: false, disabled: false });
    return elements.get(id);
  };
  const context = vm.createContext({
    console,
    URLSearchParams,
    document: { getElementById: element, addEventListener: () => {} },
    window: { location: { search: '?id=1' }, showMessage: (message) => assert.fail(message) },
  });
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '../public/js/edit-transaction.js'), 'utf8'),
    context
  );
  vm.runInContext(
    `getSelectedCategoryType = () => 'EXPENSE';
    fetchJson = async () => ({ transaction_id: 1, txn_date: '2026-09-13', account_id: 1, category_id: 2, amount: 10, is_regular: 1 });`,
    context
  );
  await vm.runInContext('loadTransaction()', context);
  assert.equal(element('isRegular').value, 'true');
  assert.equal(element('isRegular').disabled, false);
  vm.runInContext("getSelectedCategoryType = () => 'INCOME'; updateTaxClaimableState();", context);
  assert.equal(element('isRegular').value, 'false');
  assert.equal(element('isRegular').disabled, true);
});
