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
  const byOwner = Boolean(report.owners);
  const columnCount = byOwner ? 6 : 5;
  const rows = document.getElementById('reportRows');
  rows.replaceChildren();
  document.getElementById('reportTitle').textContent = new Date(
    report.year,
    report.month - 1,
    1
  ).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
  for (const group of report.owners || report.categories) {
    const name = byOwner ? group.owner_name : group.category_name;
    const heading = document.createElement('tr');
    heading.className = 'table-light';
    const groupHeading = reportCell(heading, name, 'th');
    groupHeading.colSpan = columnCount;
    groupHeading.scope = 'rowgroup';
    rows.appendChild(heading);
    for (const expense of group.expenses) {
      const row = document.createElement('tr');
      reportCell(row, expense.description, 'td', 'ps-4 report-description');
      const [year, month, day] = expense.date.split('-');
      reportCell(row, `${day}/${month}/${year}`, 'td', 'text-nowrap');
      reportCell(row, expense.account_name);
      if (byOwner) reportCell(row, expense.category_name);
      reportCell(row, expense.is_regular ? 'Yes' : 'No');
      reportCell(row, reportMoney(expense.amount), 'td', 'text-end text-nowrap');
      rows.appendChild(row);
    }
    const subtotal = document.createElement('tr');
    const label = reportCell(subtotal, `${name} Total`, 'th', 'ps-4');
    label.colSpan = columnCount - 1;
    label.scope = 'row';
    reportCell(subtotal, reportMoney(group.total), 'td', 'text-end fw-bold');
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
  const byOwner = document.body.dataset.reportGroup === 'owner';
  const [year, month] = document.getElementById('reportMonth').value.split('-');
  const regular = document.getElementById('reportRegular').value;
  const regularQuery = regular === '' ? '' : `&isRegular=${regular}`;
  const status = document.getElementById('reportStatus');
  const button = document.getElementById('generateReport');
  document.getElementById('expenseReport').hidden = true;
  document.getElementById(byOwner ? 'ownerReport' : 'dailyReport').hidden = true;
  status.className = 'text-muted';
  status.textContent = 'Loading expenses…';
  button.disabled = true;
  try {
    const response = await fetch(
      `/api/reports/${byOwner ? 'owner-expenses' : 'monthly-expenses'}?year=${year}&month=${Number(month)}${regularQuery}`
    );
    const payload = await response.json();
    if (!response.ok || !payload.success)
      throw new Error('Unable to load the expense report. Please try again.');
    if (request !== reportRequest) return;
    renderExpenseReport(payload.data);
    if (byOwner) renderOwnerSpending(payload.data);
    else renderDailySpending(payload.data);
    status.textContent = (payload.data.owners || payload.data.categories).length
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
