/**
 * Edit Transaction Page - update, delete, and duplicate flows.
 */

const TRANSACTIONS_API_BASE = '/api/transactions';
const ACCOUNTS_API_BASE = '/api/accounts';
const CATEGORIES_API_BASE = '/api/categories';

let transactionId = null;
let deleteConfirmModal = null;

function getTransactionIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get('id'));

  return Number.isInteger(id) && id > 0 ? id : null;
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

function formatDate(value) {
  if (!value) {
    return '';
  }

  return String(value).slice(0, 10);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Request failed');
  }

  return result.data || null;
}

function appendOption(selectElement, value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  selectElement.appendChild(option);
}

async function loadLookups() {
  const [accounts, categories] = await Promise.all([
    fetchJson(`${ACCOUNTS_API_BASE}?status=active`),
    fetchJson(`${CATEGORIES_API_BASE}?status=active`),
  ]);

  const accountSelect = document.getElementById('accountId');
  const categorySelect = document.getElementById('categoryId');

  accountSelect.replaceChildren();
  categorySelect.replaceChildren();

  appendOption(accountSelect, '', '-- Select Account --');
  appendOption(categorySelect, '', '-- Select Category --');

  accounts.forEach((account) => {
    appendOption(accountSelect, getAccountId(account), getAccountName(account));
  });

  categories.forEach((category) => {
    const label = `${getCategoryName(category)} (${getCategoryType(category)})`;
    appendOption(categorySelect, getCategoryId(category), label);
  });
}

async function loadTransaction() {
  transactionId = getTransactionIdFromUrl();

  if (!transactionId) {
    window.showMessage('Missing or invalid transaction ID.', 'danger', 0);
    return;
  }

  try {
    const transaction = await fetchJson(`${TRANSACTIONS_API_BASE}/${transactionId}`);

    document.getElementById('transactionId').value =
      transaction.transaction_id ?? transaction.transactionId;
    document.getElementById('txnDate').value = formatDate(
      transaction.txn_date ?? transaction.txnDate
    );
    document.getElementById('accountId').value = transaction.account_id ?? transaction.accountId;
    document.getElementById('categoryId').value = transaction.category_id ?? transaction.categoryId;
    document.getElementById('amount').value = Number(transaction.amount || 0).toFixed(2);
    document.getElementById('note').value = transaction.note || '';
  } catch (error) {
    console.error('Failed to load transaction', error);
    window.showMessage(`Error loading transaction: ${error.message}`, 'danger', 0);
  }
}

function getFormPayload() {
  return {
    txnDate: document.getElementById('txnDate').value,
    accountId: Number(document.getElementById('accountId').value),
    categoryId: Number(document.getElementById('categoryId').value),
    amount: Number(document.getElementById('amount').value),
    note: document.getElementById('note').value.trim() || null,
  };
}

function validateForm() {
  const form = document.getElementById('editTransactionForm');

  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    return false;
  }

  return true;
}

async function handleUpdateTransaction(event) {
  event.preventDefault();

  if (!validateForm()) {
    return;
  }

  try {
    await fetchJson(`${TRANSACTIONS_API_BASE}/${transactionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(getFormPayload()),
    });

    window.showMessage('Transaction updated successfully!', 'success');

    setTimeout(() => {
      window.location.href = '/pages/transactions.html';
    }, 1000);
  } catch (error) {
    console.error('Failed to update transaction', error);
    window.showMessage(`Error updating transaction: ${error.message}`, 'danger', 0);
  }
}

async function handleDuplicateTransaction() {
  if (!validateForm()) {
    return;
  }

  try {
    await fetchJson(TRANSACTIONS_API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(getFormPayload()),
    });

    window.showMessage('Transaction duplicated successfully!', 'success');

    setTimeout(() => {
      window.location.href = '/pages/transactions.html';
    }, 1000);
  } catch (error) {
    console.error('Failed to duplicate transaction', error);
    window.showMessage(`Error duplicating transaction: ${error.message}`, 'danger', 0);
  }
}

function showDeleteConfirmation() {
  if (!transactionId) {
    window.showMessage('Error: No transaction selected', 'danger');
    return;
  }

  deleteConfirmModal.show();
}

async function handleDeleteTransaction() {
  try {
    await fetchJson(`${TRANSACTIONS_API_BASE}/${transactionId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    window.showMessage('Transaction deleted successfully!', 'success');
    deleteConfirmModal.hide();

    setTimeout(() => {
      window.location.href = '/pages/transactions.html';
    }, 1000);
  } catch (error) {
    console.error('Failed to delete transaction', error);
    window.showMessage(`Error deleting transaction: ${error.message}`, 'danger', 0);
  }
}

document.addEventListener('DOMContentLoaded', async function () {
  deleteConfirmModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));

  document
    .getElementById('editTransactionForm')
    ?.addEventListener('submit', handleUpdateTransaction);
  document
    .getElementById('duplicateTransactionBtn')
    ?.addEventListener('click', handleDuplicateTransaction);
  document
    .getElementById('deleteTransactionBtn')
    ?.addEventListener('click', showDeleteConfirmation);
  document.getElementById('confirmDeleteBtn')?.addEventListener('click', handleDeleteTransaction);

  try {
    await loadLookups();
    await loadTransaction();
  } catch (error) {
    console.error('Failed to initialize edit transaction page', error);
    window.showMessage(`Error initializing edit page: ${error.message}`, 'danger', 0);
  }
});
