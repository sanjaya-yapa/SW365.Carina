const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const db = require('../src/config/db');
const reports = require('../src/services/reports.service');
const app = require('../src/app');
const originalExecute = db.execute;
after(async () => {
  db.execute = originalExecute;
  await db.end();
});

test('annual category aggregation includes zero months and exact totals, with optional regular filtering', async () => {
  for (const filter of [null, true, false]) {
    db.execute = async (sql, params) => {
      assert.deepEqual(
        params,
        filter === null ? ['2100-01-01', '2101-01-01'] : ['2100-01-01', '2101-01-01', filter]
      );
      assert.match(sql, /category_type = 'EXPENSE'/);
      assert.doesNotMatch(sql, /is_active|bank_transaction_imports/);
      assert.equal(sql.includes('AND t.is_regular = ?'), filter !== null);
      return [
        [
          { category_id: 1, category_name: 'Same name', expense_month: 1, total: '0.10' },
          { category_id: 1, category_name: 'Same name', expense_month: 12, total: '0.20' },
          { category_id: 2, category_name: 'Same name', expense_month: 1, total: '12.34' },
        ],
      ];
    };
    const report = await reports.getMonthlyAnalysis(2100, filter);
    assert.equal(report.categories.length, 2);
    assert.equal(report.categories[0].total, '0.30');
    assert.equal(report.monthly_totals.length, 12);
    assert.equal(report.monthly_totals[0], '12.44');
    assert.equal(report.monthly_totals[1], '0.00');
    assert.equal(report.monthly_totals[11], '0.20');
    assert.equal(report.grand_total, '12.64');
  }
});

test('analysis endpoint validates filters, handles empty data and hides database errors; report links resolve', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    db.execute = async () => {
      assert.fail('Invalid requests must not query the database');
    };
    for (const query of [
      '',
      '?year=1999',
      '?year=2101',
      '?year=2026.5',
      '?year=2026&isRegular=yes',
    ]) {
      assert.equal((await fetch(`${base}/api/reports/monthly-analysis${query}`)).status, 400);
    }
    db.execute = async () => [[]];
    const response = await fetch(`${base}/api/reports/monthly-analysis?year=2026&isRegular=false`);
    const { data } = await response.json();
    assert.equal(data.grand_total, '0.00');
    assert.deepEqual(data.monthly_totals, Array(12).fill('0.00'));
    db.execute = async () => {
      throw new Error('Private database information');
    };
    const failure = await fetch(`${base}/api/reports/monthly-analysis?year=2026`);
    assert.equal(failure.status, 500);
    assert.doesNotMatch(await failure.text(), /Private/);
    const landing = await (await fetch(`${base}/pages/reports.html`)).text();
    for (const file of ['daily-expenses.html', 'monthly-expense-analysis.html']) {
      assert.ok(landing.includes(`/pages/${file}`));
      const page = await fetch(`${base}/pages/${file}`);
      assert.equal(page.status, 200);
      assert.match(await page.text(), /All reports/);
    }
    assert.doesNotMatch(landing, /src="\/js\/reports.js"/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

function browserHarness() {
  const elements = new Map();
  const element = () => ({
    children: [],
    style: {},
    listeners: {},
    value: '',
    appendChild(child) {
      this.children.push(child);
    },
    append(...children) {
      this.children.push(...children);
    },
    replaceChildren() {
      this.children = [];
    },
    setAttribute(key, value) {
      this[key] = value;
    },
    addEventListener(key, fn) {
      this.listeners[key] = fn;
    },
    reportValidity() {
      return true;
    },
  });
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  };
  const charts = [];
  class Chart {
    constructor(canvas, config) {
      this.data = config.data;
      this.visible = {};
      charts.push(this);
    }
    destroy() {
      this.destroyed = true;
    }
    isDatasetVisible(i) {
      return this.visible[i] !== false;
    }
    setDatasetVisibility(i, value) {
      this.visible[i] = value;
    }
    update() {}
  }
  const context = vm.createContext({
    window: { Chart },
    document: { createElement: element, getElementById: get, addEventListener() {} },
  });
  const run = (code) => vm.runInContext(code, context);
  run(fs.readFileSync(path.join(__dirname, '../public/js/monthly-expense-analysis.js'), 'utf8'));
  context.report = {
    year: 2026,
    categories: [
      {
        category_id: 1,
        category_name: '<Food>',
        months: ['0.10', '0.20', ...Array(10).fill('0.00')],
        total: '0.30',
      },
    ],
    monthly_totals: ['0.10', '0.20', ...Array(10).fill('0.00')],
    grand_total: '0.30',
  };
  return { run, get, context, charts };
}

test('monthly changes handle increases, decreases, zero baselines, and exact rounding', () => {
  const { run } = browserHarness();
  assert.equal(run("monthlyChange('10.00', null)"), '—');
  assert.equal(run("monthlyChange('0.20', '0.10')"), '+$0.10 (+100.0%)');
  assert.equal(run("monthlyChange('0.00', '10.00')"), '-$10.00 (-100.0%)');
  assert.equal(run("monthlyChange('1.00', '0.00')"), '+$1.00 (percentage unavailable)');
  assert.equal(run("monthlyChange('0.00', '0.00')"), '$0.00 (percentage unavailable)');
  assert.equal(run("monthlyChange('4.00', '3.00')"), '+$1.00 (+33.3%)');
});

test('monthly view renders table and chart, toggles legend and handles unavailable chart', () => {
  const { run, get, charts } = browserHarness();
  run('renderMonthlyAnalysis(report)');
  assert.equal(get('monthlyBody').children.length, 12);
  assert.equal(get('monthlyHead').children[0].children[1].textContent, '<Food>');
  assert.equal(get('analysisTotal').textContent, '$0.30');
  assert.equal(get('analysisHighest').textContent, 'February · $0.20');
  get('monthlyLegend').children[0].listeners.click();
  assert.equal(charts[0].visible[0], false);
  run('window.Chart = undefined; renderMonthlyAnalysis(report)');
  assert.equal(charts[0].destroyed, true);
  assert.match(get('monthlyChartStatus').textContent, /Chart unavailable/);
  assert.equal(get('monthlyBody').children.length, 12);
});

test('changing report filters ignores an older response and hides stale content on failure', async () => {
  const { run, get, context } = browserHarness();
  get('analysisYear').value = '2026';
  const pending = [];
  context.fetch = (url) => new Promise((resolve) => pending.push({ url, resolve }));
  const first = run('loadMonthlyAnalysis()');
  get('analysisRegular').value = 'true';
  const second = run('loadMonthlyAnalysis()');
  assert.match(pending[1].url, /isRegular=true/);
  pending[1].resolve({
    ok: true,
    json: async () => ({ success: true, data: { ...context.report, year: 2025 } }),
  });
  await second;
  pending[0].resolve({ ok: true, json: async () => ({ success: true, data: context.report }) });
  await first;
  assert.match(get('analysisTitle').textContent, /2025/);
  context.fetch = async () => {
    throw new Error('Offline');
  };
  await run('loadMonthlyAnalysis()');
  assert.equal(get('monthlyAnalysis').hidden, true);
  assert.match(get('analysisStatus').textContent, /Unable to load/);
});
