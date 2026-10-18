const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function setup() {
  const nodes = new Map();
  const element = () => ({
    children: [],
    listeners: {},
    value: '',
    disabled: false,
    appendChild(child) {
      this.children.push(child);
    },
    append(...children) {
      this.children.push(...children);
    },
    replaceChildren() {
      this.children = [];
    },
    addEventListener(name, fn) {
      this.listeners[name] = fn;
    },
    focus() {},
    setAttribute(key, value) {
      this[key] = value;
    },
  });
  const get = (id) => {
    if (!nodes.has(id)) nodes.set(id, element());
    return nodes.get(id);
  };
  const context = vm.createContext({
    document: {
      getElementById: get,
      createElement: element,
      addEventListener() {},
      querySelectorAll() {
        return [];
      },
    },
  });
  const run = (code) => vm.runInContext(code, context);
  run(fs.readFileSync(path.join(__dirname, '../public/js/payments.js'), 'utf8'));
  run("localToday=()=> '2026-10-14'");
  get('paymentMonth').value = '2026-10';
  const row = {
    schedule_id: 1,
    name: 'Power',
    amount: '12.34',
    account_id: 2,
    category_id: 3,
    account_name: 'Bank',
    category_name: 'Bills',
    due_date: '2026-10-15',
    status: 'UPCOMING',
  };
  context.row = row;
  return { context, run, get, row };
}
test('calendar and agenda show scheduled amounts, upcoming list and seven-day boundaries', async () => {
  const { context, run, get, row } = setup();
  const urls = [];
  context.fetch = async (url) => {
    urls.push(url);
    return {
      ok: true,
      json: async () => ({ success: true, data: url === '/api/payments' ? [] : [row] }),
    };
  };
  await run('loadPayments()');
  assert.equal(get('paymentCalendar').children.length, 7 + 3 + 31);
  assert.equal(get('paymentAgenda').children.length, 1);
  assert.match(get('paymentSummary').textContent, /Still due \$12.34/);
  assert.ok(urls.some((url) => url.includes('from=2026-10-14&to=2026-10-20')));
  assert.equal(get('paymentsResults').hidden, false);
  context.fetch = async () => {
    throw new Error('Offline');
  };
  await run('loadPayments()');
  assert.equal(get('paymentsResults').hidden, true);
  assert.equal(get('paymentsStatus').textContent, 'Offline');
});
test('link selector uses scheduled account and category and paid occurrence cannot relink', async () => {
  const { context, run, get } = setup();
  let url;
  context.fetch = async (target) => {
    url = target;
    return {
      ok: true,
      json: async () => ({
        success: true,
        data: [{ transaction_id: 9, txn_date: '2026-10-16', amount: '13.00', note: 'Power bill' }],
      }),
    };
  };
  await run('openPayment(row)');
  assert.match(url, /accountId=2&categoryId=3/);
  assert.equal(get('linkTransaction').children.length, 2);
  assert.match(get('linkTransaction').children[1].textContent, /13.00/);
  await run("openPayment({...row,status:'PAID',transaction_id:9,actual_amount:'13.00'})");
  assert.equal(get('linkPayment').disabled, true);
  assert.equal(get('skipPayment').disabled, true);
  assert.equal(get('resetPayment').disabled, false);
  assert.match(get('occurrenceDetails').textContent, /actual \$13.00/);
});
