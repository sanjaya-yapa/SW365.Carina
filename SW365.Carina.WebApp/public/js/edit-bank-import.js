/**
 * Review Bank Import Page - converts a pending bank row into a transaction.
 */

const BANK_IMPORTS_API_BASE = '/api/bank-imports';
const ACCOUNTS_API_BASE = '/api/accounts';
const CATEGORIES_API_BASE = '/api/categories';

let importId = null;
let importRow = null;
let activeCategories = [];

function getImportIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get('id'));

  return Number.isInteger(id) && id > 0 ? id : null;
}

function formatDate(value) {
  return value ? String(value).slice(0, 10) : '';
}

function formatCurrency(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Request failed');
  }

  return result.data || null;
}

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

function getExpectedCategoryType() {
  return Number(importRow?.signed_amount ?? importRow?.signedAmount ?? 0) > 0
    ? 'INCOME'
    : 'EXPENSE';
}

function appendOption(selectElement, value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  selectElement.appendChild(option);
}

function updateTaxClaimableState() {
  const taxClaimableInput = document.getElementById('isTaxClaimable');
  const isExpenseImport = getExpectedCategoryType() === 'EXPENSE';

  taxClaimableInput.disabled = !isExpenseImport;

  if (!isExpenseImport) {
    taxClaimableInput.checked = false;
  }
}

async function loadLookups() {
  const [accounts, categories] = await Promise.all([
    fetchJson(`${ACCOUNTS_API_BASE}?status=active`),
    fetchJson(`${CATEGORIES_API_BASE}?status=active`),
  ]);
  activeCategories = categories;

  const accountSelect = document.getElementById('accountId');
  const categorySelect = document.getElementById('categoryId');
  const expectedCategoryType = getExpectedCategoryType();

  accountSelect.replaceChildren();
  categorySelect.replaceChildren();

  appendOption(accountSelect, '', '-- Select Account --');
  appendOption(categorySelect, '', `-- Select ${expectedCategoryType.toLowerCase()} category --`);

  accounts.forEach((account) => {
    appendOption(accountSelect, getAccountId(account), getAccountName(account));
  });

  categories
    .filter((category) => getCategoryType(category) === expectedCategoryType)
    .forEach((category) => {
      appendOption(categorySelect, getCategoryId(category), getCategoryName(category));
    });
}

async function loadImport() {
  importId = getImportIdFromUrl();

  if (!importId) {
    window.showMessage('Missing or invalid import ID.', 'danger', 0);
    return;
  }

  importRow = await fetchJson(`${BANK_IMPORTS_API_BASE}/${importId}`);

  if (importRow.status !== 'PENDING') {
    window.showMessage('This import has already been completed.', 'warning', 0);
  }

  const signedAmount = Number(importRow.signed_amount ?? importRow.signedAmount ?? 0);
  const amountElement = document.getElementById('importAmount');

  document.getElementById('importDate').textContent = formatDate(
    importRow.txn_date ?? importRow.txnDate
  );
  amountElement.textContent = formatCurrency(signedAmount);
  amountElement.className =
    signedAmount < 0 ? 'col-sm-9 fw-semibold text-danger' : 'col-sm-9 fw-semibold text-success';
  document.getElementById('importDescription').textContent = importRow.description || '';
}

async function handleCompleteImport(event) {
  event.preventDefault();

  const form = document.getElementById('reviewImportForm');

  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    return;
  }

  try {
    await fetchJson(`${BANK_IMPORTS_API_BASE}/${importId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: Number(document.getElementById('accountId').value),
        categoryId: Number(document.getElementById('categoryId').value),
        isTaxClaimable: document.getElementById('isTaxClaimable').checked,
      }),
    });

    window.showMessage('Transaction created from bank import.', 'success');

    setTimeout(() => {
      window.location.href = '/pages/transactions.html';
    }, 1000);
  } catch (error) {
    console.error('Failed to complete bank import', error);
    window.showMessage(`Error creating transaction: ${error.message}`, 'danger', 0);
  }
}

async function handleDeleteImport() {
  try {
    await fetchJson(`${BANK_IMPORTS_API_BASE}/${importId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    window.showMessage('Pending import deleted.', 'success');

    setTimeout(() => {
      window.location.href = '/pages/transactions.html';
    }, 1000);
  } catch (error) {
    console.error('Failed to delete bank import', error);
    window.showMessage(`Error deleting import: ${error.message}`, 'danger', 0);
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  document.getElementById('reviewImportForm')?.addEventListener('submit', handleCompleteImport);
  document.getElementById('deleteImportBtn')?.addEventListener('click', handleDeleteImport);

  try {
    await loadImport();
    await loadLookups();
    updateTaxClaimableState();
  } catch (error) {
    console.error('Failed to initialize bank import review page', error);
    window.showMessage(`Error loading import: ${error.message}`, 'danger', 0);
  }
});
