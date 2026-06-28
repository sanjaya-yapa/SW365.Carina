/**
 * Dashboard Page - Monthly planned vs actual summary.
 */

const REPORTS_API_BASE = '/api/reports';

function getCurrentYearMonth() {
  return {
    year: Number(document.getElementById('dashboardYear').value),
    month: Number(document.getElementById('dashboardMonth').value),
  };
}

function setDefaultFilters() {
  const now = new Date();
  document.getElementById('dashboardYear').value = now.getFullYear();
  document.getElementById('dashboardMonth').value = now.getMonth() + 1;
}

function formatCurrency(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function getNumber(value) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getMonthName(monthNumber) {
  const monthNames = [
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

  return monthNames[Number(monthNumber) - 1] || 'Selected month';
}

function getSummaryValue(summary, snakeCaseKey, camelCaseKey) {
  return summary?.[snakeCaseKey] ?? summary?.[camelCaseKey] ?? 0;
}

function getCategoryValue(row, snakeCaseKey, camelCaseKey) {
  return row?.[snakeCaseKey] ?? row?.[camelCaseKey] ?? '';
}

function createTypeBadge(categoryType) {
  const badge = document.createElement('span');
  badge.className =
    categoryType === 'INCOME' ? 'badge bg-info text-dark' : 'badge bg-warning text-dark';
  badge.textContent = categoryType === 'INCOME' ? 'Income' : 'Expense';
  return badge;
}

function createStatusBadge(categoryType, variance) {
  const badge = document.createElement('span');

  if (categoryType === 'INCOME') {
    badge.className = variance >= 0 ? 'badge bg-success' : 'badge bg-secondary';
    badge.textContent = variance >= 0 ? 'Above plan' : 'Below plan';
    return badge;
  }

  badge.className = variance >= 0 ? 'badge bg-success' : 'badge bg-danger';
  badge.textContent = variance >= 0 ? 'On track' : 'Over plan';
  return badge;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Request failed');
  }

  return result.data || [];
}

function buildMonthlySummaryUrl() {
  const { year, month } = getCurrentYearMonth();
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
  });

  return `${REPORTS_API_BASE}?${params.toString()}`;
}

function buildCategoryVarianceUrl() {
  const { year, month } = getCurrentYearMonth();
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
  });

  return `${REPORTS_API_BASE}/category-variance?${params.toString()}`;
}

function setLoadingState(isLoading) {
  document.getElementById('loadDashboardBtn').disabled = isLoading;
  document.getElementById('dashboardSummary').textContent = isLoading
    ? 'Loading dashboard...'
    : document.getElementById('dashboardSummary').textContent;
}

function setCardValue(elementId, amount, options = {}) {
  const element = document.getElementById(elementId);
  element.textContent = formatCurrency(amount);
  element.classList.remove('text-success', 'text-danger', 'text-secondary');

  if (!options.withSignColor) {
    return;
  }

  if (amount > 0) {
    element.classList.add('text-success');
  } else if (amount < 0) {
    element.classList.add('text-danger');
  } else {
    element.classList.add('text-secondary');
  }
}

function renderSummaryCards(summary) {
  const totalPlanned = getNumber(getSummaryValue(summary, 'total_planned', 'totalPlanned'));
  const totalActual = getNumber(getSummaryValue(summary, 'total_actual', 'totalActual'));
  const expenseVariance = getNumber(
    getSummaryValue(summary, 'expense_variance', 'expenseVariance')
  );
  const totalIncome = getNumber(
    getSummaryValue(summary, 'total_actual_income', 'totalActualIncome')
  );
  const totalExpense = getNumber(
    getSummaryValue(summary, 'total_actual_expense', 'totalActualExpense')
  );
  const netBalance = getNumber(getSummaryValue(summary, 'net_balance', 'netBalance'));

  setCardValue('totalPlanned', totalPlanned);
  setCardValue('totalActual', totalActual);
  setCardValue('expenseVariance', expenseVariance, { withSignColor: true });
  setCardValue('totalIncome', totalIncome);
  setCardValue('totalExpense', totalExpense);
  setCardValue('netBalance', netBalance, { withSignColor: true });
}

function createAmountCell(value, options = {}) {
  const cell = document.createElement('td');
  const amount = getNumber(value);
  cell.className = 'text-end fw-semibold';
  cell.textContent = formatCurrency(amount);

  if (options.withSignColor) {
    if (amount > 0) {
      cell.classList.add('text-success');
    } else if (amount < 0) {
      cell.classList.add('text-danger');
    }
  }

  return cell;
}

function createVarianceRow(row) {
  const categoryType = getCategoryValue(row, 'category_type', 'categoryType');
  const plannedAmount = getNumber(getCategoryValue(row, 'planned_amount', 'plannedAmount'));
  const actualAmount = getNumber(getCategoryValue(row, 'actual_amount', 'actualAmount'));
  const variance = getNumber(getCategoryValue(row, 'variance', 'variance'));

  const tableRow = document.createElement('tr');

  const categoryCell = document.createElement('td');
  categoryCell.textContent = getCategoryValue(row, 'category_name', 'categoryName');

  const typeCell = document.createElement('td');
  typeCell.appendChild(createTypeBadge(categoryType));

  const statusCell = document.createElement('td');
  statusCell.appendChild(createStatusBadge(categoryType, variance));

  tableRow.append(
    categoryCell,
    typeCell,
    createAmountCell(plannedAmount),
    createAmountCell(actualAmount),
    createAmountCell(variance, { withSignColor: true }),
    statusCell
  );

  return tableRow;
}

function renderVarianceTable(categoryVarianceRows) {
  const tableBody = document.getElementById('varianceTableBody');
  const emptyMessage = document.getElementById('emptyMessage');
  tableBody.replaceChildren();

  if (categoryVarianceRows.length === 0) {
    emptyMessage.classList.remove('d-none');
    emptyMessage.textContent = 'No planned or actual values found for the selected month.';
    return;
  }

  emptyMessage.classList.add('d-none');
  categoryVarianceRows.forEach((row) => tableBody.appendChild(createVarianceRow(row)));
}

function renderDashboard(summary, categoryVarianceRows) {
  const { year, month } = getCurrentYearMonth();

  renderSummaryCards(summary);
  renderVarianceTable(categoryVarianceRows);

  document.getElementById('dashboardSummary').textContent =
    `${categoryVarianceRows.length} categor${categoryVarianceRows.length === 1 ? 'y' : 'ies'} loaded for ${getMonthName(month)} ${year}.`;
}

async function loadDashboard() {
  try {
    setLoadingState(true);

    const [summary, categoryVarianceRows] = await Promise.all([
      fetchJson(buildMonthlySummaryUrl()),
      fetchJson(buildCategoryVarianceUrl()),
    ]);

    renderDashboard(summary || {}, categoryVarianceRows);
  } catch (error) {
    console.error('Failed to load dashboard', error);
    window.showMessage(`Error loading dashboard: ${error.message}`, 'danger', 0);
    document.getElementById('dashboardSummary').textContent = 'Failed to load dashboard.';
  } finally {
    setLoadingState(false);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  setDefaultFilters();

  document.getElementById('dashboardFilterForm')?.addEventListener('submit', function (event) {
    event.preventDefault();
    loadDashboard();
  });

  loadDashboard();
});
