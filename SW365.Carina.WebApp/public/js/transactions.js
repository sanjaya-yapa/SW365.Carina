/**
 * Transactions Page - Daily transaction entry and monthly list.
 */

const TRANSACTIONS_API_BASE = '/api/transactions';
const ACCOUNTS_API_BASE = '/api/accounts';
const CATEGORIES_API_BASE = '/api/categories';
const BANK_IMPORTS_API_BASE = '/api/bank-imports';

let activeAccounts = [];
let activeCategories = [];
let loadedTransactions = [];
let pendingImports = [];
let selectedTransactionIds = new Set();
let selectedPendingImportIds = new Set();
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

function setDefaultTransactionDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');

  document.getElementById('txnDate').value = `${yyyy}-${mm}-${dd}`;
}

function setDefaultFilters() {
  const today = new Date();
  const yyyy = today.getFullYear();

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

function parseDateText(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!match) {
    throw new Error(`Invalid date "${text}". Expected DD/MM/YYYY.`);
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid date "${text}".`);
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function splitDelimitedLine(line) {
  if (line.includes('\t')) {
    return line.split('\t').map((value) => value.trim());
  }

  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && nextChar === '"' && inQuotes) {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function parseBankCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error('The selected file is empty.');
  }

  const firstRow = splitDelimitedLine(lines[0]).map((value) => value.toLowerCase());
  const hasHeader =
    firstRow.includes('date') && firstRow.includes('amount') && firstRow.includes('description');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line, index) => {
    const fields = splitDelimitedLine(line);

    if (fields.length < 3) {
      throw new Error(`Row ${index + 1} does not have Date, Amount, and Description.`);
    }

    const txnDate = parseDateText(fields[0]);
    const signedAmount = Number(fields[1].replace(/[$,\s]/g, ''));
    const description = fields.slice(2).join(' ').trim();

    if (!Number.isFinite(signedAmount) || signedAmount === 0) {
      throw new Error(`Row ${index + 1} has an invalid amount.`);
    }

    if (!description) {
      throw new Error(`Row ${index + 1} is missing a description.`);
    }

    return { txnDate, signedAmount, description };
  });
}

function assertRowsMatchSelectedMonth(rows) {
  const { year, month } = getFilterValues();
  const invalidRow = rows.find((row) => {
    const [rowYear, rowMonth] = row.txnDate.split('-').map(Number);
    return rowYear !== year || rowMonth !== month;
  });

  if (invalidRow) {
    throw new Error(
      `CSV contains ${invalidRow.txnDate}, which is outside the selected month ${year}-${String(
        month
      ).padStart(2, '0')}.`
    );
  }
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

function createTaxClaimableBadge(value) {
  const badge = document.createElement('span');
  const isTaxClaimable = value === true || Number(value) === 1;

  badge.className = isTaxClaimable ? 'badge bg-success' : 'badge bg-light text-secondary border';
  badge.textContent = isTaxClaimable ? 'Yes' : 'No';

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

  updateTaxClaimableState();
}

function getSelectedCategoryType() {
  const selectedCategoryId = Number(document.getElementById('categoryId').value);
  const selectedCategory = activeCategories.find(
    (category) => Number(getCategoryId(category)) === selectedCategoryId
  );

  return selectedCategory ? getCategoryType(selectedCategory) : '';
}

function updateTaxClaimableState() {
  const taxClaimableInput = document.getElementById('isTaxClaimable');
  const isExpenseCategory = getSelectedCategoryType() === 'EXPENSE';

  taxClaimableInput.disabled = !isExpenseCategory;

  if (!isExpenseCategory) {
    taxClaimableInput.checked = false;
  }
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

function updateBulkDeleteButtons() {
  const deleteTransactionsButton = document.getElementById('deleteSelectedTransactionsBtn');
  const deleteImportsButton = document.getElementById('deleteSelectedImportsBtn');

  if (deleteTransactionsButton) {
    deleteTransactionsButton.disabled = selectedTransactionIds.size === 0;
    deleteTransactionsButton.innerHTML = `<i class="bi bi-trash me-1"></i>Delete Selected${
      selectedTransactionIds.size > 0 ? ` (${selectedTransactionIds.size})` : ''
    }`;
  }

  if (deleteImportsButton) {
    deleteImportsButton.disabled = selectedPendingImportIds.size === 0;
    deleteImportsButton.innerHTML = `<i class="bi bi-trash me-1"></i>Delete Selected${
      selectedPendingImportIds.size > 0 ? ` (${selectedPendingImportIds.size})` : ''
    }`;
  }
}

function updateTransactionSelectAllState() {
  const selectAll = document.getElementById('transactionsSelectAll');
  const visibleIds = getCurrentPageTransactions().map(
    (transaction) => transaction.transaction_id ?? transaction.transactionId
  );

  if (!selectAll) {
    return;
  }

  selectAll.checked =
    visibleIds.length > 0 && visibleIds.every((id) => selectedTransactionIds.has(Number(id)));
  selectAll.indeterminate =
    visibleIds.some((id) => selectedTransactionIds.has(Number(id))) && !selectAll.checked;
}

function updatePendingImportSelectAllState() {
  const selectAll = document.getElementById('pendingImportsSelectAll');
  const visibleIds = pendingImports.map((importRow) => importRow.import_id ?? importRow.importId);

  if (!selectAll) {
    return;
  }

  selectAll.checked =
    visibleIds.length > 0 && visibleIds.every((id) => selectedPendingImportIds.has(Number(id)));
  selectAll.indeterminate =
    visibleIds.some((id) => selectedPendingImportIds.has(Number(id))) && !selectAll.checked;
}

function updateSelectionState() {
  updateTransactionSelectAllState();
  updatePendingImportSelectAllState();
  updateBulkDeleteButtons();
}

function createTransactionRow(transaction) {
  const row = document.createElement('tr');
  const transactionId = transaction.transaction_id ?? transaction.transactionId;

  const selectCell = document.createElement('td');
  const selectInput = document.createElement('input');
  selectInput.type = 'checkbox';
  selectInput.className = 'form-check-input';
  selectInput.checked = selectedTransactionIds.has(Number(transactionId));
  selectInput.setAttribute('aria-label', `Select transaction ${transactionId}`);
  selectInput.addEventListener('change', (event) => {
    if (event.target.checked) {
      selectedTransactionIds.add(Number(transactionId));
    } else {
      selectedTransactionIds.delete(Number(transactionId));
    }

    updateSelectionState();
  });
  selectCell.appendChild(selectInput);

  const dateCell = document.createElement('td');
  dateCell.textContent = formatDate(transaction.txn_date ?? transaction.txnDate);

  const accountCell = document.createElement('td');
  accountCell.textContent = transaction.account_name ?? transaction.accountName ?? '';

  const categoryCell = document.createElement('td');
  categoryCell.textContent = transaction.category_name ?? transaction.categoryName ?? '';

  const typeCell = document.createElement('td');
  typeCell.appendChild(createTypeBadge(transaction.category_type ?? transaction.categoryType));

  const taxClaimableCell = document.createElement('td');
  taxClaimableCell.appendChild(
    createTaxClaimableBadge(transaction.is_tax_claimable ?? transaction.isTaxClaimable)
  );

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

  row.append(
    selectCell,
    dateCell,
    accountCell,
    categoryCell,
    typeCell,
    taxClaimableCell,
    amountCell,
    noteCell,
    actionsCell
  );
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
    updateSelectionState();
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
  updateSelectionState();
}

async function loadTransactions() {
  try {
    document.getElementById('transactionSummary').textContent = 'Loading transactions...';
    const transactions = await fetchJson(buildTransactionsUrl());
    loadedTransactions = transactions;
    selectedTransactionIds = new Set();
    currentPage = 1;
    renderTransactions();
  } catch (error) {
    console.error('Failed to load transactions', error);
    window.showMessage(`Error loading transactions: ${error.message}`, 'danger', 0);
    document.getElementById('transactionSummary').textContent = 'Failed to load transactions.';
  }
}

function createPendingImportRow(importRow) {
  const row = document.createElement('tr');
  const importId = importRow.import_id ?? importRow.importId;
  const signedAmount = Number(importRow.signed_amount ?? importRow.signedAmount ?? 0);

  const selectCell = document.createElement('td');
  const selectInput = document.createElement('input');
  selectInput.type = 'checkbox';
  selectInput.className = 'form-check-input';
  selectInput.checked = selectedPendingImportIds.has(Number(importId));
  selectInput.setAttribute('aria-label', `Select pending import ${importId}`);
  selectInput.addEventListener('change', (event) => {
    if (event.target.checked) {
      selectedPendingImportIds.add(Number(importId));
    } else {
      selectedPendingImportIds.delete(Number(importId));
    }

    updateSelectionState();
  });
  selectCell.appendChild(selectInput);

  const dateCell = document.createElement('td');
  dateCell.textContent = formatDate(importRow.txn_date ?? importRow.txnDate);

  const amountCell = document.createElement('td');
  amountCell.className =
    signedAmount < 0 ? 'text-end fw-semibold text-danger' : 'text-end fw-semibold text-success';
  amountCell.textContent = formatCurrency(signedAmount);

  const descriptionCell = document.createElement('td');
  descriptionCell.textContent = importRow.description || '';

  const actionsCell = document.createElement('td');
  const reviewButton = document.createElement('a');
  reviewButton.className = 'btn btn-sm btn-primary';
  reviewButton.href = `/pages/edit-bank-import.html?id=${encodeURIComponent(importId)}`;
  reviewButton.innerHTML = '<i class="bi bi-check2-square me-1"></i>Review';
  actionsCell.appendChild(reviewButton);

  row.append(selectCell, dateCell, amountCell, descriptionCell, actionsCell);
  return row;
}

function renderPendingImports() {
  const tableBody = document.getElementById('pendingImportsTableBody');
  const emptyMessage = document.getElementById('pendingImportsEmptyMessage');
  const summary = document.getElementById('pendingImportsSummary');

  tableBody.replaceChildren();

  if (pendingImports.length === 0) {
    emptyMessage.classList.remove('d-none');
    emptyMessage.textContent = 'No pending imports for the selected month.';
    summary.textContent = '0 pending';
    updateSelectionState();
    return;
  }

  emptyMessage.classList.add('d-none');
  pendingImports.forEach((importRow) => tableBody.appendChild(createPendingImportRow(importRow)));
  summary.textContent = `${pendingImports.length} pending`;
  updateSelectionState();
}

async function loadPendingImports() {
  try {
    const { year, month } = getFilterValues();
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
      status: 'PENDING',
    });

    pendingImports = await fetchJson(`${BANK_IMPORTS_API_BASE}?${params.toString()}`);
    selectedPendingImportIds = new Set();
    renderPendingImports();
  } catch (error) {
    console.error('Failed to load pending imports', error);
    window.showMessage(`Error loading pending imports: ${error.message}`, 'danger', 0);
    document.getElementById('pendingImportsSummary').textContent = 'Failed to load imports.';
  }
}

async function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('load', () => resolve(String(reader.result || '')));
    reader.addEventListener('error', () => reject(new Error('Failed to read selected file.')));
    reader.readAsText(file);
  });
}

async function handleBankImportSubmit(event) {
  event.preventDefault();

  const form = document.getElementById('bankImportForm');
  const file = document.getElementById('bankCsvFile').files[0];

  if (!form.checkValidity() || !file) {
    form.classList.add('was-validated');
    return;
  }

  try {
    const text = await readFileText(file);
    const rows = parseBankCsv(text);
    assertRowsMatchSelectedMonth(rows);

    const result = await fetchJson(BANK_IMPORTS_API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    });

    form.reset();
    form.classList.remove('was-validated');
    window.showMessage(
      `Import complete: ${result.inserted} added, ${result.skipped} duplicate${
        result.skipped === 1 ? '' : 's'
      } skipped.`,
      'success'
    );
    await loadPendingImports();
  } catch (error) {
    console.error('Failed to import bank CSV', error);
    window.showMessage(`Error importing CSV: ${error.message}`, 'danger', 0);
  }
}

async function handleDeleteSelectedTransactions() {
  const ids = Array.from(selectedTransactionIds);

  if (ids.length === 0) {
    return;
  }

  const confirmed = window.confirm(
    `Delete ${ids.length} selected transaction${ids.length === 1 ? '' : 's'}?`
  );

  if (!confirmed) {
    return;
  }

  try {
    const result = await fetchJson(TRANSACTIONS_API_BASE, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });

    window.showMessage(`${result.affectedRows} transaction(s) deleted.`, 'success');
    selectedTransactionIds = new Set();
    await loadTransactions();
  } catch (error) {
    console.error('Failed to delete selected transactions', error);
    window.showMessage(`Error deleting transactions: ${error.message}`, 'danger', 0);
  }
}

async function handleDeleteSelectedImports() {
  const ids = Array.from(selectedPendingImportIds);

  if (ids.length === 0) {
    return;
  }

  const confirmed = window.confirm(
    `Delete ${ids.length} selected pending import${ids.length === 1 ? '' : 's'}?`
  );

  if (!confirmed) {
    return;
  }

  try {
    const result = await fetchJson(BANK_IMPORTS_API_BASE, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });

    window.showMessage(`${result.affectedRows} pending import(s) deleted.`, 'success');
    selectedPendingImportIds = new Set();
    await loadPendingImports();
  } catch (error) {
    console.error('Failed to delete selected pending imports', error);
    window.showMessage(`Error deleting pending imports: ${error.message}`, 'danger', 0);
  }
}

function handleTransactionsSelectAll(event) {
  const visibleIds = getCurrentPageTransactions().map(
    (transaction) => transaction.transaction_id ?? transaction.transactionId
  );

  visibleIds.forEach((id) => {
    if (event.target.checked) {
      selectedTransactionIds.add(Number(id));
    } else {
      selectedTransactionIds.delete(Number(id));
    }
  });

  renderTransactions();
}

function handlePendingImportsSelectAll(event) {
  pendingImports.forEach((importRow) => {
    const id = importRow.import_id ?? importRow.importId;

    if (event.target.checked) {
      selectedPendingImportIds.add(Number(id));
    } else {
      selectedPendingImportIds.delete(Number(id));
    }
  });

  renderPendingImports();
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
    isTaxClaimable: document.getElementById('isTaxClaimable').checked,
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
    setDefaultTransactionDate();
    updateTaxClaimableState();
    await loadTransactions();
  } catch (error) {
    console.error('Failed to save transaction', error);
    window.showMessage(`Error saving transaction: ${error.message}`, 'danger', 0);
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  setDefaultTransactionDate();
  setDefaultFilters();

  document.getElementById('transactionForm')?.addEventListener('submit', handleTransactionSubmit);
  document.getElementById('categoryId')?.addEventListener('change', updateTaxClaimableState);
  document.getElementById('transactionFilterForm')?.addEventListener('submit', function (event) {
    event.preventDefault();
    loadTransactions();
    loadPendingImports();
  });
  document.getElementById('bankImportForm')?.addEventListener('submit', handleBankImportSubmit);
  document
    .getElementById('deleteSelectedTransactionsBtn')
    ?.addEventListener('click', handleDeleteSelectedTransactions);
  document
    .getElementById('deleteSelectedImportsBtn')
    ?.addEventListener('click', handleDeleteSelectedImports);
  document
    .getElementById('transactionsSelectAll')
    ?.addEventListener('change', handleTransactionsSelectAll);
  document
    .getElementById('pendingImportsSelectAll')
    ?.addEventListener('change', handlePendingImportsSelectAll);
  document.getElementById('pageSizeSelect')?.addEventListener('change', function (event) {
    pageSize = Number(event.target.value);
    currentPage = 1;
    renderTransactions();
  });

  try {
    await loadLookups();
    await loadTransactions();
    await loadPendingImports();
  } catch (error) {
    console.error('Failed to initialize transactions page', error);
    window.showMessage(`Error initializing transactions page: ${error.message}`, 'danger', 0);
  }
});
