function reportMoney(amount) {
  const [whole, fraction] = String(amount).split('.');
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction}`;
}

function reportCell(row, text, tag = 'td', className = '') {
  const cell = document.createElement(tag);
  cell.textContent = text;
  cell.className = className;
  row.appendChild(cell);
  return cell;
}

function renderExpenseReport(report) {
  const rows = document.getElementById('reportRows');
  rows.replaceChildren();
  document.getElementById('reportTitle').textContent = new Date(
    report.year,
    report.month - 1,
    1
  ).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
  for (const category of report.categories) {
    const heading = document.createElement('tr');
    heading.className = 'table-light';
    reportCell(heading, category.category_name, 'th').colSpan = 5;
    rows.appendChild(heading);
    for (const expense of category.expenses) {
      const row = document.createElement('tr');
      reportCell(row, expense.description, 'td', 'ps-4 report-description');
      const [year, month, day] = expense.date.split('-');
      reportCell(row, `${day}/${month}/${year}`, 'td', 'text-nowrap');
      reportCell(row, expense.account_name);
      reportCell(row, expense.is_regular ? 'Yes' : 'No');
      reportCell(row, reportMoney(expense.amount), 'td', 'text-end text-nowrap');
      rows.appendChild(row);
    }
    const subtotal = document.createElement('tr');
    const label = reportCell(subtotal, `${category.category_name} Total`, 'th', 'ps-4');
    label.colSpan = 4;
    label.scope = 'row';
    reportCell(subtotal, reportMoney(category.total), 'td', 'text-end fw-bold');
    rows.appendChild(subtotal);
  }
  document.getElementById('grandTotal').textContent = reportMoney(report.grand_total);
  document.getElementById('expenseReport').hidden = false;
}

let reportRequest = 0;
async function loadExpenseReport(event) {
  if (event) event.preventDefault();
  const form = document.getElementById('reportFilters');
  if (!form.reportValidity()) return;
  const request = ++reportRequest;
  const [year, month] = document.getElementById('reportMonth').value.split('-');
  const regular = document.getElementById('reportRegular').value;
  const regularQuery = regular === '' ? '' : `&isRegular=${regular}`;
  const status = document.getElementById('reportStatus');
  const button = document.getElementById('generateReport');
  document.getElementById('expenseReport').hidden = true;
  status.className = 'text-muted';
  status.textContent = 'Loading expenses…';
  button.disabled = true;
  try {
    const response = await fetch(
      `/api/reports/monthly-expenses?year=${year}&month=${Number(month)}${regularQuery}`
    );
    const payload = await response.json();
    if (!response.ok || !payload.success)
      throw new Error('Unable to load the expense report. Please try again.');
    if (request !== reportRequest) return;
    renderExpenseReport(payload.data);
    status.textContent = payload.data.categories.length
      ? ''
      : 'No expenses match the selected filters.';
  } catch (error) {
    if (request !== reportRequest) return;
    status.className = 'text-danger';
    status.textContent = 'Unable to load the expense report. Please try again.';
  } finally {
    if (request === reportRequest) button.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const today = new Date();
  document.getElementById('reportMonth').value =
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  document.getElementById('reportFilters').addEventListener('submit', loadExpenseReport);
  document.getElementById('reportMonth').addEventListener('change', loadExpenseReport);
  document.getElementById('reportRegular').addEventListener('change', loadExpenseReport);
  loadExpenseReport();
});
