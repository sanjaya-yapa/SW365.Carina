// Keep exact cents for aggregation and tables; convert to numbers only for plotting.
function spendingCents(amount) {
  const [whole, fraction = ''] = String(amount).split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

function spendingMoney(cents) {
  return reportMoney(`${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`);
}

function buildDailySpending(report) {
  const count = new Date(report.year, report.month, 0).getDate();
  const prefix = `${report.year}-${String(report.month).padStart(2, '0')}-`;
  const dates = Array.from(
    { length: count },
    (_, i) => `${prefix}${String(i + 1).padStart(2, '0')}`
  );
  const categories = report.categories.map((category) => {
    const cents = Array(count).fill(0n);
    for (const expense of category.expenses) {
      const index = dates.indexOf(expense.date);
      if (index >= 0) cents[index] += spendingCents(expense.amount);
    }
    return { id: category.category_id, name: category.category_name, cents };
  });
  const totals = dates.map((_, i) =>
    categories.reduce((sum, category) => sum + category.cents[i], 0n)
  );
  return { dates, categories, totals };
}

function spendingColour(id) {
  // Stable per category, including when the regular filter removes other categories.
  let hash = 0;
  for (const char of String(id)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `hsl(${(hash * 137.508) % 360}, 65%, 43%)`;
}

let dailyChart = null;
let dailyView = 'chart';

function setDailyView(view) {
  dailyView = view;
  document.getElementById('dailyChartPanel').hidden = view !== 'chart';
  document.getElementById('dailyTablePanel').hidden = view !== 'table';
  document
    .getElementById('dailyChartButton')
    .setAttribute('aria-pressed', String(view === 'chart'));
  document
    .getElementById('dailyTableButton')
    .setAttribute('aria-pressed', String(view === 'table'));
  if (view === 'chart' && dailyChart) dailyChart.resize();
}

function renderDailyTable(model) {
  const head = document.getElementById('dailyTableHead');
  const body = document.getElementById('dailyTableBody');
  const foot = document.getElementById('dailyTableFoot');
  head.replaceChildren();
  body.replaceChildren();
  foot.replaceChildren();
  const headings = document.createElement('tr');
  for (const label of [
    'Date',
    ...model.categories.map((category) => category.name),
    'Daily total',
  ]) {
    reportCell(headings, label, 'th').scope = 'col';
  }
  head.appendChild(headings);
  model.dates.forEach((date, i) => {
    const row = document.createElement('tr');
    reportCell(row, date.split('-').reverse().join('/'), 'th').scope = 'row';
    for (const category of model.categories)
      reportCell(row, spendingMoney(category.cents[i]), 'td', 'text-end');
    reportCell(row, spendingMoney(model.totals[i]), 'td', 'text-end fw-bold');
    body.appendChild(row);
  });
  const totalRow = document.createElement('tr');
  reportCell(totalRow, 'Month total', 'th').scope = 'row';
  for (const values of [...model.categories.map((category) => category.cents), model.totals]) {
    reportCell(
      totalRow,
      spendingMoney(values.reduce((sum, amount) => sum + amount, 0n)),
      'td',
      'text-end fw-bold'
    );
  }
  foot.appendChild(totalRow);
}

function renderDailySpending(report) {
  if (dailyChart) {
    dailyChart.destroy();
    dailyChart = null;
  }
  const model = buildDailySpending(report);
  renderDailyTable(model);
  const month = new Date(report.year, report.month - 1, 1).toLocaleDateString('en-AU', {
    month: 'long',
    year: 'numeric',
  });
  document.getElementById('dailySummary').textContent =
    `${month} · Total spending ${spendingMoney(model.totals.reduce((sum, amount) => sum + amount, 0n))}`;
  const status = document.getElementById('dailyChartStatus');
  status.textContent = model.categories.length
    ? ''
    : 'No expenses match the selected filters. All days have zero spending.';
  const legend = document.getElementById('dailyLegend');
  legend.replaceChildren();
  document.getElementById('dailyReport').hidden = false;
  document.getElementById('dailyChartButton').disabled = false;
  setDailyView(dailyView);
  try {
    dailyChart = new window.Chart(document.getElementById('dailySpendingChart'), {
      type: 'bar',
      data: {
        labels: model.dates.map((_, i) => String(i + 1)),
        datasets: model.categories.map((category) => ({
          label: category.name,
          data: category.cents.map((cents) => Number(cents) / 100),
          backgroundColor: spendingColour(category.id),
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { stacked: true, title: { display: true, text: 'Day of month' } },
          y: {
            stacked: true,
            beginAtZero: true,
            title: { display: true, text: 'Spending ($)' },
            ticks: { callback: (value) => `$${value}` },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => model.dates[items[0].dataIndex].split('-').reverse().join('/'),
              label: (item) =>
                `${item.dataset.label}: ${spendingMoney(model.categories[item.datasetIndex].cents[item.dataIndex])}`,
              footer: (items) => {
                const index = items[0].dataIndex;
                const visible = items.reduce(
                  (sum, item) => sum + model.categories[item.datasetIndex].cents[index],
                  0n
                );
                return [
                  `Visible categories: ${spendingMoney(visible)}`,
                  `All categories: ${spendingMoney(model.totals[index])}`,
                ];
              },
            },
          },
        },
      },
    });
    model.categories.forEach((category, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-sm btn-outline-secondary';
      button.setAttribute('aria-pressed', 'true');
      const swatch = document.createElement('span');
      swatch.className = 'daily-legend-swatch';
      swatch.style.backgroundColor = spendingColour(category.id);
      swatch.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.textContent = category.name;
      button.append(swatch, label);
      button.addEventListener('click', () => {
        const visible = !dailyChart.isDatasetVisible(index);
        dailyChart.setDatasetVisibility(index, visible);
        button.setAttribute('aria-pressed', String(visible));
        dailyChart.update();
      });
      legend.appendChild(button);
    });
  } catch (error) {
    if (dailyChart) {
      dailyChart.destroy();
      dailyChart = null;
    }
    status.textContent = 'The chart could not be loaded. Daily spending is available in the table.';
    document.getElementById('dailyChartButton').disabled = true;
    setDailyView('table');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document
    .getElementById('dailyChartButton')
    .addEventListener('click', () => setDailyView('chart'));
  document
    .getElementById('dailyTableButton')
    .addEventListener('click', () => setDailyView('table'));
});
