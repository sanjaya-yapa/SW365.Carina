const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function setup() {
  const elements = new Map();
  const messages = [];
  const context = vm.createContext({
    console,
    URLSearchParams,
    document: {
      addEventListener() {},
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, {});
        return elements.get(id);
      },
    },
    window: {
      addEventListener() {},
      showMessage(message) {
        messages.push(message);
      },
    },
  });
  const run = (code) => vm.runInContext(code, context);
  run(fs.readFileSync(path.join(__dirname, '../public/js/transactions.js'), 'utf8'));
  return { context, run, messages, elements };
}
test('HTML gateway errors identify failing request/status without exposing HTML', async () => {
  const { context, run } = setup();
  for (const status of [502, 503, 504, 404, 200]) {
    context.fetch = async () => ({
      status,
      ok: status === 200,
      text: async () => '<html><h1>Private proxy details</h1></html>',
    });
    await assert.rejects(run("fetchJson('/api/accounts?status=active')"), (error) => {
      assert.match(error.message, /\/api\/accounts/);
      assert.ok(error.message.includes(`HTTP ${status}`));
      assert.doesNotMatch(error.message, /Unexpected token|Private proxy/);
      return true;
    });
  }
});
test('valid JSON, API errors, null payloads and network failures are handled', async () => {
  const { context, run } = setup();
  context.fetch = async () => ({
    status: 200,
    ok: true,
    text: async () => JSON.stringify({ success: true, data: [{ id: 1 }] }),
  });
  assert.equal((await run("fetchJson('/api/transactions')"))[0].id, 1);
  context.fetch = async () => ({
    status: 400,
    ok: false,
    text: async () => JSON.stringify({ success: false, message: 'Invalid month' }),
  });
  await assert.rejects(run("fetchJson('/api/transactions')"), /Invalid month/);
  context.fetch = async () => ({ status: 200, ok: true, text: async () => 'null' });
  await assert.rejects(run("fetchJson('/api/transactions')"), /Invalid API response/);
  context.fetch = async () => {
    throw new Error('Failed to fetch');
  };
  await assert.rejects(run("fetchJson('/api/transactions')"), /Cannot reach/);
});
test('Load retries failed lookup initialization before loading transactions and imports', async () => {
  const { context, run, messages, elements } = setup();
  let attempts = 0;
  let transactions = 0;
  let imports = 0;
  context.loadLookups = async () => {
    attempts++;
    if (attempts === 1) throw new Error('Gateway unavailable');
    run('transactionLookupsReady = true');
  };
  context.loadTransactions = async () => {
    transactions++;
  };
  context.loadPendingImports = async () => {
    imports++;
  };
  await run('loadTransactionPage()');
  assert.equal(transactions, 0);
  assert.match(messages[0], /Gateway unavailable/);
  assert.match(elements.get('transactionSummary').textContent, /Load to retry/);
  await run('loadTransactionPage()');
  await run('loadTransactionPage()');
  assert.equal(attempts, 2);
  assert.equal(transactions, 2);
  assert.equal(imports, 2);
});
