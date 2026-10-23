const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function setup() {
  const elements = new Map();
  function element() {
    return {
      children: [],
      hidden: false,
      className: '',
      appendChild(child) {
        this.children.push(child);
      },
      replaceChildren() {
        this.children = [];
      },
    };
  }
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  };
  const charts = [];
  class Chart {
    constructor(canvas, config) {
      this.config = config;
      charts.push(this);
    }
    destroy() {
      this.destroyed = true;
    }
  }
  const context = vm.createContext({
    document: {
      createElement: element,
      getElementById: get,
      addEventListener() {},
      body: { dataset: { reportGroup: 'owner' } },
    },
    window: { Chart },
  });
  for (const file of ['reports.js', 'owner-spending.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/js', file), 'utf8'), context);
  }
  context.report = {
    year: 2026,
    month: 10,
    grand_total: '10.00',
    owners: [
      { owner_id: null, owner_name: 'Unassigned', total: '2.50', expenses: [] },
      {
        owner_id: 1,
        owner_name: '<Alex>',
        total: '7.50',
        expenses: [
          {
            date: '2026-10-01',
            description: '<script>alert(1)</script>',
            account_name: 'Cash',
            category_name: 'Food',
            is_regular: true,
            amount: '7.50',
          },
        ],
      },
    ],
  };
  return { context, get, charts, run: (code) => vm.runInContext(code, context) };
}

test('pie slices and tooltip agree with owner details and grand total', () => {
  const { run, get, charts } = setup();
  run('renderExpenseReport(report); renderOwnerSpending(report)');
  const config = charts[0].config;
  assert.equal(config.type, 'pie');
  assert.deepEqual(Array.from(config.data.labels), ['Unassigned', '<Alex>']);
  assert.deepEqual(Array.from(config.data.datasets[0].data), [2.5, 7.5]);
  assert.equal(
    config.options.plugins.tooltip.callbacks.label({ dataIndex: 1 }),
    '<Alex>: $7.50 (75.0%)'
  );
  assert.notEqual(...config.data.datasets[0].backgroundColor);
  const rows = get('reportRows').children;
  assert.equal(rows[0].children[0].textContent, 'Unassigned');
  assert.equal(rows[0].children[0].colSpan, 6);
  assert.equal(rows[3].children[0].textContent, '<script>alert(1)</script>');
  assert.equal(rows[3].children[4].textContent, 'Yes');
  assert.equal(rows[3].children[5].textContent, '$7.50');
  assert.equal(rows[4].children[0].colSpan, 5);
  assert.equal(get('grandTotal').textContent, '$10.00');
  assert.equal(get('ownerReport').hidden, false);
  assert.equal(get('ownerSpendingChart').hidden, false);
});

test('regeneration destroys prior chart, zero totals stay in details, empty report has no slices', () => {
  const { run, get, charts } = setup();
  run('renderOwnerSpending(report)');
  run("report.owners[0].total = '0.00'; renderExpenseReport(report); renderOwnerSpending(report)");
  assert.equal(charts[0].destroyed, true);
  assert.equal(charts[1].config.data.labels.length, 1);
  assert.equal(get('reportRows').children[0].children[0].textContent, 'Unassigned');
  run("renderOwnerSpending({ owners: [], grand_total: '0.00' })");
  assert.equal(charts[1].destroyed, true);
  assert.equal(charts.length, 2);
  assert.equal(get('ownerSpendingChart').hidden, true);
  assert.match(get('ownerChartStatus').textContent, /No spending/);
});

test('missing chart library explicitly reports failure without losing expense details', () => {
  const { run, get } = setup();
  run('window.Chart = undefined; renderExpenseReport(report); renderOwnerSpending(report)');
  assert.match(get('ownerChartStatus').textContent, /could not be loaded/);
  assert.equal(get('ownerSpendingChart').hidden, true);
  assert.equal(get('expenseReport').hidden, false);
  assert.equal(get('grandTotal').textContent, '$10.00');
});

test('owner loader uses the selected filters, renders results and reports HTTP failures', async () => {
  const { run, get, context, charts } = setup();
  get('reportFilters').reportValidity = () => true;
  get('reportMonth').value = '2026-10';
  get('reportRegular').value = 'false';
  context.fetch = async (url) => {
    assert.equal(url, '/api/reports/owner-expenses?year=2026&month=10&isRegular=false');
    return { ok: true, json: async () => ({ success: true, data: context.report }) };
  };
  await run('loadExpenseReport()');
  assert.equal(charts.length, 1);
  assert.equal(get('expenseReport').hidden, false);
  assert.equal(get('generateReport').disabled, false);
  context.fetch = async () => ({ ok: false, json: async () => ({ success: false }) });
  await run('loadExpenseReport()');
  assert.match(get('reportStatus').textContent, /Unable to load/);
  assert.equal(get('expenseReport').hidden, true);
  assert.equal(get('ownerReport').hidden, true);
  assert.equal(get('generateReport').disabled, false);
});
