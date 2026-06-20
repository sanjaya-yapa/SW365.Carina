/**
 * Edit Account Page - Form Submission Handler
 */

const API_BASE = '/api/accounts';
let accountId = null;
let deleteConfirmModal = null;

function getAccountIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get('id'));

  return Number.isInteger(id) && id > 0 ? id : null;
}

function getAccountValue(account, snakeName, camelName, fallback = '') {
  return account[snakeName] ?? account[camelName] ?? fallback;
}

async function loadAccount() {
  accountId = getAccountIdFromUrl();

  if (!accountId) {
    window.showMessage('Missing or invalid account ID.', 'danger', 0);
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/${accountId}`);
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to load account');
    }

    const account = result.data;
    document.getElementById('editId').value = getAccountValue(account, 'account_id', 'id');
    document.getElementById('editName').value = getAccountValue(account, 'account_name', 'name');
    document.getElementById('editType').value = getAccountValue(
      account,
      'account_type',
      'accountType'
    );
    document.getElementById('editBalance').value = Number(
      getAccountValue(account, 'opening_balance', 'openingBalance', 0)
    ).toFixed(2);
  } catch (error) {
    console.error('Failed to load account', error);
    window.showMessage(`Error loading account: ${error.message}`, 'danger', 0);
  }
}

async function handleEditAccountSubmit(event) {
  event.preventDefault();

  const form = document.getElementById('editAccountForm');

  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    return;
  }

  const id = document.getElementById('editId').value;
  const name = document.getElementById('editName').value.trim();
  const accountType = document.getElementById('editType').value;
  const openingBalance = Number(document.getElementById('editBalance').value || 0);

  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        accountType,
        openingBalance,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to update account');
    }

    window.showMessage('Account updated successfully!', 'success');

    setTimeout(() => {
      window.location.href = '/pages/accounts.html';
    }, 1000);
  } catch (error) {
    console.error('Failed to update account', error);
    window.showMessage(`Error updating account: ${error.message}`, 'danger', 0);
  }
}

function showDeleteConfirmation() {
  if (!accountId) {
    window.showMessage('Error: No account selected', 'danger');
    return;
  }

  deleteConfirmModal.show();
}

async function handleDeleteAccount() {
  try {
    const response = await fetch(`${API_BASE}/${accountId}/deactivate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to delete account');
    }

    window.showMessage('Account deleted successfully!', 'success');
    deleteConfirmModal.hide();

    setTimeout(() => {
      window.location.href = '/pages/accounts.html';
    }, 1000);
  } catch (error) {
    console.error('Failed to delete account', error);
    window.showMessage(`Error deleting account: ${error.message}`, 'danger', 0);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  deleteConfirmModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));

  loadAccount();

  document.getElementById('editAccountForm')?.addEventListener('submit', handleEditAccountSubmit);
  document.getElementById('deleteAccountBtn')?.addEventListener('click', showDeleteConfirmation);
  document.getElementById('confirmDeleteBtn')?.addEventListener('click', handleDeleteAccount);
});
