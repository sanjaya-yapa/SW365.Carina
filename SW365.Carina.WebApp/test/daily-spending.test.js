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
      style: {},
      listeners: {},
      hidden: false,
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
      addEventListener(name, fn) {
        this.listeners[name] = fn;
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
      this.visible = {};
      charts.push(this);
    }
    destroy() {
      this.destroyed = true;
    }
    resize() {}
    update() {}
    isDatasetVisible(i) {
      return this.visible[i] !== false;
    }
    setDatasetVisibility(i, visible) {
      this.visible[i] = visible;
    }
  }
  const context = vm.createContext({
    document: { createElement: element, getElementById: get, addEventListener() {} },
    window: { Chart },
  });
  for (const file of ['reports.js', 'daily-spending.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/js', file), 'utf8'), context);
  }
  const report = {
    year: 2024,
    month: 2,
    categories: [
      {
        category_id: 1,
        category_name: 'Food',
        expenses: [
          { date: '2024-02-01', amount: '0.10' },
          { date: '2024-02-01', amount: '0.20' },
        ],
      },
      {
        category_id: 2,
        category_name: '<Bills>',
        expenses: [{ date: '2024-02-29', amount: '12.34' }],
      },
    ],
  };
  context.report = report;
  return { context, get, charts, run: (code) => vm.runInContext(code, context) };
}

test('daily aggregation handles leap years, month lengths, zero days and exact category totals', () => {
  const { run } = setup();
  const model = run('buildDailySpending(report)');
  assert.equal(model.dates.length, 29);
  assert.equal(model.categories[0].cents[0], 30n);
  assert.equal(model.totals[1], 0n);
  assert.equal(model.totals[28], 1234n);
  assert.equal(
    model.totals.reduce((a, b) => a + b),
    1264n
  );
  assert.equal(run('buildDailySpending({year: 2025, month: 2, categories: []}).dates.length'), 28);
  assert.equal(run('buildDailySpending({year: 2026, month: 4, categories: []}).dates.length'), 30);
  assert.equal(
    run('buildDailySpending({year: 2026, month: 12, categories: []}).dates[30]'),
    '2026-12-31'
  );
});

test('chart, tooltip and accessible table agree; legend and view controls work', () => {
  const { run, get, charts } = setup();
  run('renderDailySpending(report)');
  assert.equal(charts[0].config.options.scales.y.stacked, true);
  assert.equal(charts[0].config.data.datasets[0].data[0], 0.3);
  assert.equal(get('dailyTableBody').children.length, 29);
  assert.equal(get('dailyTableFoot').children[0].children[3].textContent, '$12.64');
  assert.equal(get('dailyTableHead').children[0].children[2].textContent, '<Bills>');
  const callbacks = charts[0].config.options.plugins.tooltip.callbacks;
  assert.equal(callbacks.title([{ dataIndex: 28 }]), '29/02/2024');
  assert.equal(callbacks.footer([{ dataIndex: 0, datasetIndex: 0 }])[1], 'All categories: $0.30');
  const legend = get('dailyLegend').children[0];
  legend.listeners.click();
  assert.equal(charts[0].visible[0], false);
  assert.equal(legend['aria-pressed'], 'false');
  run("setDailyView('table')");
  assert.equal(get('dailyChartPanel').hidden, true);
  assert.equal(get('dailyTablePanel').hidden, false);
  run('renderDailySpending({year: 2026, month: 4, categories: []})');
  assert.equal(charts[0].destroyed, true);
  assert.equal(get('dailyTableBody').children.length, 30);
  assert.equal(get('dailyLegend').children.length, 0);
  assert.match(get('dailyChartStatus').textContent, /No expenses/);
});

test('missing chart library falls back to the daily table', () => {
  const { run, get } = setup();
  run('window.Chart = undefined; renderDailySpending(report)');
  assert.equal(get('dailyTablePanel').hidden, false);
  assert.equal(get('dailyChartButton').disabled, true);
  assert.match(get('dailyChartStatus').textContent, /could not be loaded/);
});

test('Azure production dependency is served by the application', async () => {
  const app = require('../src/app');
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/vendor/chart.umd.js`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /javascript/);
    assert.match(await response.text(), /Chart\.js/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
