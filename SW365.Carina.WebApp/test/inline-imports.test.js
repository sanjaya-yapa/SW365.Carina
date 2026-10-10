const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup() {
  function element() {
    return {
      children: [],
      listeners: {},
      value: '',
      disabled: false,
      classList: { add() {}, remove() {} },
      appendChild(child) {
        this.children.push(child);
      },
      append(...children) {
        this.children.push(...children);
      },
      replaceChildren() {
        this.children = [];
      },
      setAttribute(name, value) {
        this[name] = value;
      },
      addEventListener(name, handler) {
        this.listeners[name] = handler;
      },
      get firstChild() {
        return this.children[0];
      },
    };
  }
  const elements = new Map();
  const listeners = {};
  const context = vm.createContext({
    console,
    URLSearchParams,
    document: {
      createElement: element,
      addEventListener() {},
      querySelectorAll: () => [],
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, element());
        return elements.get(id);
      },
    },
    window: {
      addEventListener(name, handler) {
        listeners[name] = handler;
      },
      showMessage() {},
    },
  });
  const run = (code) => vm.runInContext(code, context);
  run(fs.readFileSync(path.join(__dirname, '../public/js/transactions.js'), 'utf8'));
  run(`activeAccounts = [{account_id: 1, account_name: 'Bank'}];
    activeCategories = [
      {category_id: 2, category_name: 'Bills', category_type: 'EXPENSE'},
      {category_id: 3, category_name: 'Salary', category_type: 'INCOME'},
      {category_id: 4, category_name: 'Asset', category_type: 'ASSET'}
    ];
    pendingImports = [1, 2, 3].map(id => ({import_id: id, signed_amount: -10, description: 'Bill'}));
    loadTransactions = async () => {};`);
  return { context, run, listeners };
}

test('inline controls filter categories, retain edits on rerender and preserve Review', () => {
  const { run } = setup();
  const row = run('createPendingImportRow(pendingImports[0])');
  const account = row.children[4].firstChild;
  const category = row.children[5].firstChild;
  assert.equal(category.children.length, 2);
  assert.equal(category.children[1].textContent, 'Bills');
  account.value = '1';
  account.listeners.change();
  category.value = '2';
  category.listeners.change();
  const rerendered = run('createPendingImportRow(pendingImports[0])');
  assert.equal(rerendered.children[4].firstChild.value, '1');
  assert.equal(rerendered.children[5].firstChild.value, '2');
  assert.equal(rerendered.children[8].children[1].href, '/pages/edit-bank-import.html?id=1');
  const income = run('createPendingImportRow({import_id: 4, signed_amount: 10})');
  assert.equal(income.children[5].firstChild.children[1].textContent, 'Salary');
  assert.equal(income.children[6].firstChild.disabled, true);
  assert.equal(income.children[7].firstChild.disabled, true);
});

test('batch completion retains failed and unselected drafts and validates missing choices', async () => {
  const { context, run } = setup();
  const calls = [];
  context.fetchJson = async (url, options) => {
    calls.push({ url, payload: JSON.parse(options.body) });
    if (url.includes('/2/')) throw new Error('Request failed');
  };
  run(`for (const id of [1, 2, 3]) Object.assign(getImportDraft(id), {
    accountId: '1', categoryId: '2', isTaxClaimable: true, isRegular: true, dirty: true
  }); selectedPendingImportIds = new Set([1, 2]);`);
  await run('completePendingImports([1, 2])');
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].payload, {
    accountId: 1,
    categoryId: 2,
    isTaxClaimable: true,
    isRegular: true,
  });
  assert.equal(run('pendingImports.length'), 2);
  assert.equal(run('importDrafts.has(1)'), false);
  assert.equal(run('getImportDraft(2).error'), 'Request failed');
  assert.equal(run('getImportDraft(3).categoryId'), '2');
  assert.equal(run('selectedPendingImportIds.has(2)'), true);
  run("getImportDraft(2).categoryId = ''");
  await run('completePendingImports([2])');
  assert.equal(calls.length, 2);
  assert.match(run('getImportDraft(2).error'), /Select an account/);
});

test('completion prevents duplicate clicks and warns before leaving with unsaved work', async () => {
  const { context, run, listeners } = setup();
  let release;
  let calls = 0;
  context.fetchJson = () => {
    calls += 1;
    return new Promise((resolve) => {
      release = resolve;
    });
  };
  run("Object.assign(getImportDraft(1), {accountId: '1', categoryId: '2', dirty: true})");
  const completion = run('completePendingImports([1])');
  await run('completePendingImports([1])');
  assert.equal(calls, 1);
  let prevented = false;
  listeners.beforeunload({
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  release({});
  await completion;
  assert.equal(run('hasUnsavedImports()'), false);
  assert.equal(run('completingImports'), false);
});
