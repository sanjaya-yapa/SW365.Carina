/**
 * Budgets Page - Monthly planned values grid.
 */

const BUDGETS_API_BASE = '/api/budgets';
const CATEGORIES_API_BASE = '/api/categories';

let currentCategories = [];
let currentPlansByCategoryId = new Map();

function getCurrentYearMonth() {
  return {
    year: Number(document.getElementById('budgetYear').value),
    month: Number(document.getElementById('budgetMonth').value),
  };
}

function getCategoryId(category) {
  return category.category_id ?? category.id;
}

function getCategoryName(category) {
  return category.category_name ?? category.name ?? '';
}

function getCategoryType(category) {
  return category.category_type ?? category.categoryType ?? '';
}

function getPlanCategoryId(plan) {
  return plan.category_id ?? plan.categoryId;
}

function formatAmount(value) {
  return Number(value || 0).toFixed(2);
}

function setDefaultFilters() {
  const now = new Date();
  document.getElementById('budgetYear').value = now.getFullYear();
  document.getElementById('budgetMonth').value = now.getMonth() + 1;
}

function setLoadingState(isLoading) {
  document.getElementById('saveBudgetBtn').disabled = isLoading;
  document.getElementById('budgetSummary').textContent = isLoading
    ? 'Loading budget grid...'
    : document.getElementById('budgetSummary').textContent;
}

function createTypeBadge(categoryType) {
  const badge = document.createElement('span');
  const typeBadges = {
    INCOME: { className: 'badge bg-info text-dark', label: 'Income' },
    EXPENSE: { className: 'badge bg-warning text-dark', label: 'Expense' },
    ASSET: { className: 'badge bg-success', label: 'Asset' },
  };
  const details = typeBadges[categoryType] || {
    className: 'badge bg-secondary',
    label: categoryType,
  };
  badge.className = details.className;
  badge.textContent = details.label;
  return badge;
}

function createStatusBadge(hasExistingPlan) {
  const badge = document.createElement('span');
  badge.className = hasExistingPlan ? 'badge bg-success' : 'badge bg-secondary';
  badge.textContent = hasExistingPlan ? 'Saved' : 'New';
  return badge;
}

function createBudgetRow(category) {
  const categoryId = getCategoryId(category);
  const categoryType = getCategoryType(category);
  const plan = currentPlansByCategoryId.get(Number(categoryId));
  const hasExistingPlan = Boolean(plan);

  const row = document.createElement('tr');
  row.dataset.categoryId = categoryId;

  const planIdCell = document.createElement('td');
  planIdCell.textContent = plan?.plan_id ?? '-';

  const categoryCell = document.createElement('td');
  categoryCell.textContent = getCategoryName(category);

  const typeCell = document.createElement('td');
  typeCell.appendChild(createTypeBadge(categoryType));

  const amountCell = document.createElement('td');
  const amountInput = document.createElement('input');
  amountInput.type = 'number';
  amountInput.className = 'form-control form-control-sm';
  amountInput.min = '0';
  amountInput.step = '0.01';
  amountInput.value = formatAmount(plan?.planned_amount ?? plan?.plannedAmount ?? 0);
  amountInput.dataset.field = 'plannedAmount';
  amountCell.appendChild(amountInput);

  const noteCell = document.createElement('td');
  const noteInput = document.createElement('input');
  noteInput.type = 'text';
  noteInput.className = 'form-control form-control-sm';
  noteInput.maxLength = 255;
  noteInput.value = plan?.note ?? '';
  noteInput.dataset.field = 'note';
  noteCell.appendChild(noteInput);

  const statusCell = document.createElement('td');
  statusCell.appendChild(createStatusBadge(hasExistingPlan));

  row.append(planIdCell, categoryCell, typeCell, amountCell, noteCell, statusCell);
  return row;
}

function renderBudgetGrid() {
  const tableBody = document.getElementById('budgetGridBody');
  const emptyMessage = document.getElementById('emptyMessage');
  tableBody.replaceChildren();

  if (currentCategories.length === 0) {
    emptyMessage.classList.remove('d-none');
    emptyMessage.textContent =
      'No active categories found. Create categories before entering budgets.';
    document.getElementById('budgetSummary').textContent = 'No categories available.';
    return;
  }

  emptyMessage.classList.add('d-none');
  currentCategories.forEach((category) => tableBody.appendChild(createBudgetRow(category)));

  const existingCount = currentPlansByCategoryId.size;
  document.getElementById('budgetSummary').textContent =
    `${currentCategories.length} categories loaded, ${existingCount} existing plan rows found.`;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Request failed');
  }

  return result.data || [];
}

async function loadCategories() {
  currentCategories = await fetchJson(`${CATEGORIES_API_BASE}?status=active`);
}

async function loadBudgetPlans() {
  const { year, month } = getCurrentYearMonth();
  const plans = await fetchJson(
    `${BUDGETS_API_BASE}?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`
  );

  currentPlansByCategoryId = new Map(plans.map((plan) => [Number(getPlanCategoryId(plan)), plan]));
}

async function loadBudgetGrid() {
  try {
    setLoadingState(true);
    await Promise.all([loadCategories(), loadBudgetPlans()]);
    renderBudgetGrid();
  } catch (error) {
    console.error('Failed to load budget grid', error);
    window.showMessage(`Error loading budget grid: ${error.message}`, 'danger', 0);
    document.getElementById('budgetSummary').textContent = 'Failed to load budget grid.';
  } finally {
    setLoadingState(false);
  }
}

function getBudgetRowsPayload() {
  const { year, month } = getCurrentYearMonth();
  const rows = Array.from(document.querySelectorAll('#budgetGridBody tr'));

  return rows.map((row) => {
    const plannedAmount = Number(row.querySelector('[data-field="plannedAmount"]').value || 0);
    const note = row.querySelector('[data-field="note"]').value.trim();

    return {
      year,
      month,
      categoryId: Number(row.dataset.categoryId),
      plannedAmount,
      note: note || null,
    };
  });
}

function validateBudgetPayload(payload) {
  const invalidRow = payload.find(
    (row) => !Number.isFinite(row.plannedAmount) || row.plannedAmount < 0
  );

  if (invalidRow) {
    throw new Error('Planned amounts must be valid numbers greater than or equal to zero.');
  }
}

async function saveBudgetGrid() {
  try {
    const payload = getBudgetRowsPayload();
    validateBudgetPayload(payload);

    document.getElementById('saveBudgetBtn').disabled = true;

    await Promise.all(
      payload.map((row) =>
        fetchJson(`${BUDGETS_API_BASE}/upsert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(row),
        })
      )
    );

    window.showMessage('Budget plan saved successfully!', 'success');
    await loadBudgetGrid();
  } catch (error) {
    console.error('Failed to save budget grid', error);
    window.showMessage(`Error saving budget plan: ${error.message}`, 'danger', 0);
  } finally {
    document.getElementById('saveBudgetBtn').disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', function () {
  setDefaultFilters();

  document.getElementById('budgetFilterForm')?.addEventListener('submit', function (event) {
    event.preventDefault();
    loadBudgetGrid();
  });

  document.getElementById('saveBudgetBtn')?.addEventListener('click', saveBudgetGrid);

  loadBudgetGrid();
});
