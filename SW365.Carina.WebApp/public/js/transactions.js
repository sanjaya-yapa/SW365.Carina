/**
 * Transactions Page - Daily transaction entry and monthly list.
 */

const TRANSACTIONS_API_BASE = '/api/transactions';
const ACCOUNTS_API_BASE = '/api/accounts';
const CATEGORIES_API_BASE = '/api/categories';

let activeAccounts = [];
let activeCategories = [];
let loadedTransactions = [];
let currentPage = 1;
let pageSize = 10;

function getAccountId(account) {
  return account.account_id ?? account.id;
}

function getAccountName(account) {
  return account.account_name ?? account.name ?? '';
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

function setDefaultDates() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');

  document.getElementById('txnDate').value = `${yyyy}-${mm}-${dd}`;
  document.getElementById('filterYear').value = yyyy;
  document.getElementById('filterMonth').value = today.getMonth() + 1;
}

function formatCurrency(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) {
    return '';
  }

  return String(value).slice(0, 10);
}

function createTypeBadge(categoryType) {
  const badge = document.createElement('span');
  badge.className =
    categoryType === 'INCOME' ? 'badge bg-info text-dark' : 'badge bg-warning text-dark';
  badge.textContent = categoryType === 'INCOME' ? 'Income' : 'Expense';
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

function appendOption(selectElement, value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  selectElement.appendChild(option);
}

function populateAccountOptions() {
  const accountSelect = document.getElementById('accountId');
  const filterAccountSelect = document.getElementById('filterAccountId');

  accountSelect.replaceChildren();
  filterAccountSelect.replaceChildren();

  appendOption(accountSelect, '', '-- Select Account --');
  appendOption(filterAccountSelect, '', 'All Accounts');

  activeAccounts.forEach((account) => {
    const id = getAccountId(account);
    const name = getAccountName(account);
    appendOption(accountSelect, id, name);
    appendOption(filterAccountSelect, id, name);
  });
}

function populateCategoryOptions() {
  const categorySelect = document.getElementById('categoryId');
  const filterCategorySelect = document.getElementById('filterCategoryId');

  categorySelect.replaceChildren();
  filterCategorySelect.replaceChildren();

  appendOption(categorySelect, '', '-- Select Category --');
  appendOption(filterCategorySelect, '', 'All Categories');

  activeCategories.forEach((category) => {
    const id = getCategoryId(category);
    const label = `${getCategoryName(category)} (${getCategoryType(category)})`;
    appendOption(categorySelect, id, label);
    appendOption(filterCategorySelect, id, label);
  });
}

async function loadLookups() {
  [activeAccounts, activeCategories] = await Promise.all([
    fetchJson(`${ACCOUNTS_API_BASE}?status=active`),
    fetchJson(`${CATEGORIES_API_BASE}?status=active`),
  ]);

  populateAccountOptions();
  populateCategoryOptions();
}

function getFilterValues() {
  return {
    year: Number(document.getElementById('filterYear').value),
    month: Number(document.getElementById('filterMonth').value),
    accountId: document.getElementById('filterAccountId').value,
    categoryId: document.getElementById('filterCategoryId').value,
  };
}

function buildTransactionsUrl() {
  const { year, month, accountId, categoryId } = getFilterValues();
  const params = new URLSearchParams({
    year: String(year),
    month: String(month),
  });

  if (accountId) {
    params.set('accountId', accountId);
  }

  if (categoryId) {
    params.set('categoryId', categoryId);
  }

  return `${TRANSACTIONS_API_BASE}?${params.toString()}`;
}

function createTransactionRow(transaction) {
  const row = document.createElement('tr');
  const transactionId = transaction.transaction_id ?? transaction.transactionId;

  const dateCell = document.createElement('td');
  dateCell.textContent = formatDate(transaction.txn_date ?? transaction.txnDate);

  const accountCell = document.createElement('td');
  accountCell.textContent = transaction.account_name ?? transaction.accountName ?? '';

  const categoryCell = document.createElement('td');
  categoryCell.textContent = transaction.category_name ?? transaction.categoryName ?? '';

  const typeCell = document.createElement('td');
  typeCell.appendChild(createTypeBadge(transaction.category_type ?? transaction.categoryType));

  const amountCell = document.createElement('td');
  amountCell.className = 'text-end fw-semibold';
  amountCell.textContent = formatCurrency(transaction.amount);

  const noteCell = document.createElement('td');
  noteCell.textContent = transaction.note || '';

  const actionsCell = document.createElement('td');
  const editButton = document.createElement('a');
  editButton.className = 'btn btn-sm btn-primary';
  editButton.href = `/pages/edit-transaction.html?id=${encodeURIComponent(transactionId)}`;
  editButton.innerHTML = '<i class="bi bi-pencil me-1"></i>Edit';
  actionsCell.appendChild(editButton);

  row.append(dateCell, accountCell, categoryCell, typeCell, amountCell, noteCell, actionsCell);
  return row;
}

function getTotalPages() {
  return Math.max(1, Math.ceil(loadedTransactions.length / pageSize));
}

function getCurrentPageTransactions() {
  const startIndex = (currentPage - 1) * pageSize;
  return loadedTransactions.slice(startIndex, startIndex + pageSize);
}

function setPage(nextPage) {
  const totalPages = getTotalPages();
  currentPage = Math.min(Math.max(nextPage, 1), totalPages);
  renderTransactions();
}

function createPaginationItem(label, page, options = {}) {
  const item = document.createElement('li');
  item.className = `page-item${options.active ? ' active' : ''}${options.disabled ? ' disabled' : ''}`;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'page-link';
  button.textContent = label;
  button.disabled = options.disabled;
  button.addEventListener('click', () => setPage(page));

  item.appendChild(button);
  return item;
}

function renderPagination() {
  const paginationList = document.getElementById('paginationList');
  const paginationControls = document.getElementById('paginationControls');
  const totalPages = getTotalPages();

  paginationList.replaceChildren();

  if (loadedTransactions.length === 0) {
    paginationControls.classList.add('d-none');
    return;
  }

  paginationControls.classList.remove('d-none');
  paginationList.appendChild(
    createPaginationItem('Previous', currentPage - 1, { disabled: currentPage === 1 })
  );

  for (let page = 1; page <= totalPages; page += 1) {
    paginationList.appendChild(
      createPaginationItem(String(page), page, { active: page === currentPage })
    );
  }

  paginationList.appendChild(
    createPaginationItem('Next', currentPage + 1, { disabled: currentPage === totalPages })
  );
}

function renderTransactionTotals(transactions) {
  const totals = transactions.reduce(
    (summary, transaction) => {
      const amount = Number(transaction.amount || 0);
      const categoryType = transaction.category_type ?? transaction.categoryType;

      if (categoryType === 'INCOME') {
        summary.income += amount;
      } else if (categoryType === 'EXPENSE') {
        summary.expense += amount;
      }

      return summary;
    },
    { income: 0, expense: 0 }
  );

  const net = totals.income - totals.expense;
  document.getElementById('transactionTotals').textContent =
    `Income ${formatCurrency(totals.income)} | Expense ${formatCurrency(totals.expense)} | Net ${formatCurrency(net)}`;
}

function renderTransactions() {
  const tableBody = document.getElementById('transactionsTableBody');
  const emptyMessage = document.getElementById('emptyMessage');
  const pageTransactions = getCurrentPageTransactions();

  tableBody.replaceChildren();

  if (loadedTransactions.length === 0) {
    emptyMessage.classList.remove('d-none');
    emptyMessage.textContent = 'No transactions found for the selected filters.';
    document.getElementById('transactionSummary').textContent = 'No transactions loaded.';
    document.getElementById('transactionTotals').textContent = '';
    renderPagination();
    return;
  }

  emptyMessage.classList.add('d-none');
  pageTransactions.forEach((transaction) =>
    tableBody.appendChild(createTransactionRow(transaction))
  );

  const startRow = (currentPage - 1) * pageSize + 1;
  const endRow = Math.min(currentPage * pageSize, loadedTransactions.length);
  document.getElementById('transactionSummary').textContent =
    `Showing ${startRow}-${endRow} of ${loadedTransactions.length} transaction${
      loadedTransactions.length === 1 ? '' : 's'
    }.`;
  renderTransactionTotals(loadedTransactions);
  renderPagination();
}

async function loadTransactions() {
  try {
    document.getElementById('transactionSummary').textContent = 'Loading transactions...';
    const transactions = await fetchJson(buildTransactionsUrl());
    loadedTransactions = transactions;
    currentPage = 1;
    renderTransactions();
  } catch (error) {
    console.error('Failed to load transactions', error);
    window.showMessage(`Error loading transactions: ${error.message}`, 'danger', 0);
    document.getElementById('transactionSummary').textContent = 'Failed to load transactions.';
  }
}

async function handleTransactionSubmit(event) {
  event.preventDefault();

  const form = document.getElementById('transactionForm');

  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    return;
  }

  const payload = {
    txnDate: document.getElementById('txnDate').value,
    accountId: Number(document.getElementById('accountId').value),
    categoryId: Number(document.getElementById('categoryId').value),
    amount: Number(document.getElementById('amount').value),
    note: document.getElementById('note').value.trim() || null,
  };

  try {
    await fetchJson(TRANSACTIONS_API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    window.showMessage('Transaction saved successfully!', 'success');
    form.reset();
    form.classList.remove('was-validated');
    setDefaultDates();
    await loadTransactions();
  } catch (error) {
    console.error('Failed to save transaction', error);
    window.showMessage(`Error saving transaction: ${error.message}`, 'danger', 0);
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  setDefaultDates();

  document.getElementById('transactionForm')?.addEventListener('submit', handleTransactionSubmit);
  document.getElementById('transactionFilterForm')?.addEventListener('submit', function (event) {
    event.preventDefault();
    loadTransactions();
  });
  document.getElementById('pageSizeSelect')?.addEventListener('change', function (event) {
    pageSize = Number(event.target.value);
    currentPage = 1;
    renderTransactions();
  });

  try {
    await loadLookups();
    await loadTransactions();
  } catch (error) {
    console.error('Failed to initialize transactions page', error);
    window.showMessage(`Error initializing transactions page: ${error.message}`, 'danger', 0);
  }
});
