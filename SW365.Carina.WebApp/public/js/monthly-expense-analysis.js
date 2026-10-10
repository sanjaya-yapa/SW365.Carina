const analysisMonths = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
let analysisChart = null;
let analysisRequest = 0;

function analysisCents(amount) {
  const [whole, fraction = ''] = String(amount).split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

function analysisMoney(amount) {
  const cents = typeof amount === 'bigint' ? amount : analysisCents(amount);
  const absolute = cents < 0n ? -cents : cents;
  return `${cents < 0n ? '-' : ''}$${String(absolute / 100n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${String(absolute % 100n).padStart(2, '0')}`;
}

function monthlyChange(current, previous) {
  if (previous === null) return '—';
  const before = analysisCents(previous);
  const delta = analysisCents(current) - before;
  const sign = delta > 0n ? '+' : '';
  const absolute = delta < 0n ? -delta : delta;
  // One decimal percentage, rounded using integer arithmetic.
  const tenths = before === 0n ? null : (absolute * 1000n + before / 2n) / before;
  const percentage =
    tenths === null
      ? 'percentage unavailable'
      : `${delta < 0n ? '-' : sign}${tenths / 10n}.${tenths % 10n}%`;
  return `${sign}${analysisMoney(delta)} (${percentage})`;
}

function analysisCell(row, text, tag = 'td') {
  const cell = document.createElement(tag);
  cell.textContent = text;
  cell.className = tag === 'td' ? 'text-end' : '';
  row.appendChild(cell);
  return cell;
}

function renderMonthlyAnalysis(report) {
  if (analysisChart) {
    analysisChart.destroy();
    analysisChart = null;
  }
  document.getElementById('monthlyAnalysis').hidden = false;
  const regular = document.getElementById('analysisRegular').value;
  document.getElementById('analysisTitle').textContent =
    `${report.year} · ${regular === '' ? 'All expenses' : regular === 'true' ? 'Regular expenses' : 'Non-regular expenses'}`;
  document.getElementById('analysisTotal').textContent = analysisMoney(report.grand_total);
  const totals = report.monthly_totals.map(analysisCents);
  const highest = totals.reduce((max, value) => (value > max ? value : max), 0n);
  const highestMonths = analysisMonths.filter((_, i) => totals[i] === highest);
  document.getElementById('analysisHighest').textContent =
    highest === 0n
      ? 'No recorded expenses'
      : `${highestMonths.join(', ')} · ${analysisMoney(highest)}${highestMonths.length > 1 ? ' each' : ''}`;
  const head = document.getElementById('monthlyHead');
  const body = document.getElementById('monthlyBody');
  const foot = document.getElementById('monthlyFoot');
  head.replaceChildren();
  body.replaceChildren();
  foot.replaceChildren();
  const headings = document.createElement('tr');
  for (const label of [
    'Month',
    ...report.categories.map((category) => category.category_name),
    'Total',
    'Change from previous month',
  ]) {
    analysisCell(headings, label, 'th').scope = 'col';
  }
  head.appendChild(headings);
  analysisMonths.forEach((month, i) => {
    const row = document.createElement('tr');
    analysisCell(row, month, 'th').scope = 'row';
    for (const category of report.categories) analysisCell(row, analysisMoney(category.months[i]));
    analysisCell(row, analysisMoney(report.monthly_totals[i]));
    analysisCell(
      row,
      monthlyChange(report.monthly_totals[i], i === 0 ? null : report.monthly_totals[i - 1])
    );
    body.appendChild(row);
  });
  const totalRow = document.createElement('tr');
  analysisCell(totalRow, 'Year total', 'th').scope = 'row';
  report.categories.forEach((category) => analysisCell(totalRow, analysisMoney(category.total)));
  analysisCell(totalRow, analysisMoney(report.grand_total));
  analysisCell(totalRow, '—');
  foot.appendChild(totalRow);
  const legend = document.getElementById('monthlyLegend');
  legend.replaceChildren();
  const status = document.getElementById('monthlyChartStatus');
  status.textContent = highest === 0n ? 'No expenses match the selected filters.' : '';
  try {
    analysisChart = new window.Chart(document.getElementById('monthlySpendingChart'), {
      type: 'bar',
      data: {
        labels: analysisMonths,
        datasets: report.categories.map((category, index) => ({
          label: category.category_name,
          data: category.months.map(Number),
          backgroundColor: `hsl(${(index * 137.508) % 360}, 65%, 43%)`,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Spending ($)' } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) =>
                `${item.dataset.label}: ${analysisMoney(report.categories[item.datasetIndex].months[item.dataIndex])}`,
              footer: (items) =>
                `All categories: ${analysisMoney(report.monthly_totals[items[0].dataIndex])}`,
            },
          },
        },
      },
    });
    report.categories.forEach((category, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-sm btn-outline-secondary';
      button.setAttribute('aria-pressed', 'true');
      const swatch = document.createElement('span');
      swatch.className = 'daily-legend-swatch';
      swatch.style.backgroundColor = analysisChart.data.datasets[index].backgroundColor;
      swatch.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.textContent = category.category_name;
      button.append(swatch, label);
      button.addEventListener('click', () => {
        const visible = !analysisChart.isDatasetVisible(index);
        analysisChart.setDatasetVisibility(index, visible);
        button.setAttribute('aria-pressed', String(visible));
        analysisChart.update();
      });
      legend.appendChild(button);
    });
  } catch (error) {
    if (analysisChart) {
      analysisChart.destroy();
      analysisChart = null;
    }
    status.textContent =
      'Chart unavailable. All amounts are available in the monthly comparison table.';
  }
}

async function loadMonthlyAnalysis(event) {
  if (event) event.preventDefault();
  if (!document.getElementById('monthlyFilters').reportValidity()) return;
  const request = ++analysisRequest;
  const year = document.getElementById('analysisYear').value;
  const regular = document.getElementById('analysisRegular').value;
  const status = document.getElementById('analysisStatus');
  document.getElementById('monthlyAnalysis').hidden = true;
  status.className = 'text-muted';
  status.textContent = 'Loading monthly analysis...';
  document.getElementById('generateAnalysis').disabled = true;
  try {
    const response = await fetch(
      `/api/reports/monthly-analysis?year=${encodeURIComponent(year)}${regular === '' ? '' : `&isRegular=${regular}`}`
    );
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error('Unable to load analysis');
    if (request !== analysisRequest) return;
    renderMonthlyAnalysis(payload.data);
    status.textContent = '';
  } catch (error) {
    if (request !== analysisRequest) return;
    status.className = 'text-danger';
    status.textContent = 'Unable to load the monthly analysis. Please try again.';
  } finally {
    if (request === analysisRequest) document.getElementById('generateAnalysis').disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('analysisYear').value = new Date().getFullYear();
  document.getElementById('monthlyFilters').addEventListener('submit', loadMonthlyAnalysis);
  document.getElementById('analysisYear').addEventListener('change', loadMonthlyAnalysis);
  document.getElementById('analysisRegular').addEventListener('change', loadMonthlyAnalysis);
  loadMonthlyAnalysis();
});
