const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/config/db');
const app = require('../src/app');
const imports = require('../src/services/bank-imports.service');

const originalExecute = db.execute;
const originalGetConnection = db.getConnection;
after(async () => {
  db.execute = originalExecute;
  db.getConnection = originalGetConnection;
  await db.end();
});

async function withApi(action) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    await action(`http://127.0.0.1:${server.address().port}/api`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function request(method, body) {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

test('owners API lists, creates and edits validated contact details; handles missing owners', async () => {
  const calls = [];
  const owner = {
    owner_id: 7,
    first_name: 'First',
    last_name: 'Last',
    full_name: 'First Last',
    email_address: null,
    phone_number: '+61 1234',
  };
  db.execute = async (sql, params) => {
    calls.push({ sql, params });
    if (sql.startsWith('INSERT')) return [{ insertId: 7 }];
    if (sql.startsWith('UPDATE')) return [{ affectedRows: 1 }];
    if (params?.[0] === 99) return [[]];
    return [[owner]];
  };
  await withApi(async (base) => {
    let response = await fetch(`${base}/transaction-owners`);
    assert.deepEqual((await response.json()).data, [owner]);
    response = await fetch(
      `${base}/transaction-owners`,
      request('POST', {
        firstName: ' First ',
        lastName: ' Last ',
        phoneNumber: '+61 1234',
      })
    );
    assert.equal(response.status, 201);
    assert.equal((await response.json()).data.full_name, 'First Last');
    assert.deepEqual(calls.find((call) => call.sql.startsWith('INSERT')).params, [
      'First',
      'Last',
      null,
      '+61 1234',
    ]);
    response = await fetch(
      `${base}/transaction-owners/7`,
      request('PUT', {
        firstName: 'New',
        lastName: 'Name',
        emailAddress: 'new@example.com',
      })
    );
    assert.equal(response.status, 200);
    assert.deepEqual(calls.find((call) => call.sql.startsWith('UPDATE')).params, [
      'New',
      'Name',
      'new@example.com',
      null,
      7,
    ]);
    for (const invalid of [
      { firstName: ' ' },
      { lastName: 5 },
      { emailAddress: 'not-email' },
      { firstName: 'a'.repeat(101) },
      { phoneNumber: '1'.repeat(51) },
    ]) {
      const count = calls.length;
      response = await fetch(
        `${base}/transaction-owners`,
        request('POST', {
          firstName: 'First',
          lastName: 'Last',
          ...invalid,
        })
      );
      assert.equal(response.status, 400);
      assert.equal(calls.length, count);
    }
    response = await fetch(
      `${base}/transaction-owners/99`,
      request('PUT', {
        firstName: 'First',
        lastName: 'Last',
      })
    );
    assert.equal(response.status, 404);
  });
});

test('transaction writes pass owner, clear explicitly, preserve omitted updates and reject invalid IDs', async () => {
  const calls = [];
  db.execute = async (sql, params) => {
    calls.push({ sql, params });
    if (params.includes(999)) {
      const error = new Error('Transaction owner not found');
      error.sqlState = '45000';
      throw error;
    }
    return [[[{ transactionId: 1, affectedRows: 1 }]]];
  };
  await withApi(async (base) => {
    const body = { txnDate: '2026-10-22', accountId: 1, categoryId: 2, amount: 10 };
    for (const method of ['POST', 'PUT']) {
      const url = `${base}/transactions${method === 'PUT' ? '/1' : ''}`;
      for (const ownerId of [7, null, undefined]) {
        const response = await fetch(url, request(method, { ...body, ownerId }));
        assert.equal(response.status, method === 'POST' ? 201 : 200);
        const params = calls.at(-1).params;
        assert.equal(params[method === 'POST' ? 7 : 8], ownerId ?? null);
        if (method === 'PUT') assert.equal(params[9], ownerId !== undefined);
      }
      for (const ownerId of [0, -1, true, [], {}, '', 'abc', 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        const count = calls.length;
        const response = await fetch(url, request(method, { ...body, ownerId }));
        assert.equal(response.status, 400);
        assert.equal(calls.length, count);
      }
      const response = await fetch(url, request(method, { ...body, ownerId: 999 }));
      assert.equal(response.status, 404);
    }
  });
});

test('transaction reads include owner fields and a left join for unassigned transactions', async () => {
  const calls = [];
  const owner = { transaction_id: 1, owner_id: 7, owner_full_name: 'First Last' };
  db.execute = async (sql) => {
    calls.push(sql);
    return sql.startsWith('CALL') ? [[[owner]]] : [[owner]];
  };
  await withApi(async (base) => {
    for (const suffix of ['/transactions/1', '/transactions?year=2026&month=10']) {
      const response = await fetch(`${base}${suffix}`);
      assert.equal(response.status, 200);
      const data = (await response.json()).data;
      assert.equal((Array.isArray(data) ? data[0] : data).owner_id, 7);
    }
  });
  assert.match(calls[0], /LEFT JOIN transaction_owners/);
  assert.match(calls[0], /o.full_name AS owner_full_name/);
});

test('bank import completion passes owner within the existing transaction and rolls back invalid owners', async () => {
  db.execute = async (sql) =>
    sql.includes('FROM categories')
      ? [[{ category_type: 'EXPENSE' }]]
      : [
          [
            {
              import_id: 1,
              status: 'PENDING',
              signed_amount: -10,
              amount: 10,
              txn_date: '2026-10-22',
              description: 'Bill',
            },
          ],
        ];
  const calls = [];
  let commits = 0;
  let rollbacks = 0;
  let releases = 0;
  db.getConnection = async () => ({
    beginTransaction: async () => {},
    execute: async (sql, params) => {
      calls.push({ sql, params });
      if (params.includes(999)) throw new Error('Transaction owner not found');
      return [[[{ transactionId: 42 }]]];
    },
    commit: async () => {
      commits++;
    },
    rollback: async () => {
      rollbacks++;
    },
    release: () => {
      releases++;
    },
  });
  await withApi(async (base) => {
    const response = await fetch(
      `${base}/bank-imports/1/complete`,
      request('POST', {
        accountId: 1,
        categoryId: 2,
        ownerId: 7,
      })
    );
    assert.equal(response.status, 200);
    assert.equal(calls[0].params[7], 7);
    assert.equal(commits, 1);
    const invalid = await fetch(
      `${base}/bank-imports/1/complete`,
      request('POST', {
        accountId: 1,
        categoryId: 2,
        ownerId: -1,
      })
    );
    assert.equal(invalid.status, 400);
    assert.equal(commits, 1);
  });
  await assert.rejects(imports.completeImport(1, 1, 2, false, false, 999), /owner not found/);
  assert.equal(rollbacks, 1);
  assert.equal(releases, 2);
});
