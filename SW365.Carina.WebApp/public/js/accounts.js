/**
 * Accounts Page - API Integration and Event Handlers
 * Handles list, add, edit, and deactivate operations for accounts
 */

const API_BASE = '/api/accounts';
let addModal, editModal;
let currentAccountId = null;

/**
 * Load all accounts from the API and render them in the table
 */
async function loadAccounts() {
  try {
    console.log('🔍 DEBUG: Fetching accounts...');
    
    const response = await fetch(API_BASE);
    const result = await response.json();

    console.log('🔍 DEBUG: Full API response:', result);

    if (!result.success) {
      throw new Error(result.message || 'Failed to load accounts');
    }

    const accounts = result.data || [];
    console.log('🔍 DEBUG: Accounts data:', accounts);
    if (accounts.length > 0) {
      console.log('🔍 DEBUG: First account structure:', Object.keys(accounts[0]));
    }

    renderAccountsCards(accounts);
    console.log('✅ SUCCESS: Accounts loaded and rendered', accounts);
  } catch (error) {
    console.error('❌ ERROR: Failed to load accounts', error);
    window.showMessage(`Error loading accounts: ${error.message}`, 'danger');
    document.getElementById('emptyMessage').textContent = 'Failed to load accounts. Please try again.';
  }
}

/**
 * Render accounts as cards in a grid layout
 * @param {Array} accounts - Array of account objects
 */
function renderAccountsCards(accounts) {
  const grid = document.getElementById('accountsGrid');
  const emptyMessage = document.getElementById('emptyMessage');

  if (accounts.length === 0) {
    grid.innerHTML = '';
    emptyMessage.textContent = 'No accounts found. Create one to get started.';
    return;
  }

  emptyMessage.textContent = '';
  grid.innerHTML = accounts
    .map((account) => {
      // Handle both snake_case (from DB) and camelCase
      const id = account.id || account.account_id;
      const name = account.name || account.account_name;
      const type = account.account_type || account.accountType;
      const balance = parseFloat(
        account.opening_balance || account.openingBalance || 0
      ).toFixed(2);
      const isActive = account.is_active !== undefined ? account.is_active : account.isActive;

      const statusBadge =
        isActive === 1 || isActive === true
          ? '<span class="badge bg-success">Active</span>'
          : '<span class="badge bg-secondary">Inactive</span>';

      return `
        <div class="col-md-4">
          <div class="card h-100" style="cursor: pointer;">
            <div class="card-body" onclick="openEditModal(${id}, '${name}', '${type}', ${balance})">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <h5 class="card-title mb-0">${name}</h5>
                ${statusBadge}
              </div>
              <p class="card-text">
                <small class="text-muted">Type: <strong>${type}</strong></small>
              </p>
              <p class="card-text">
                <small class="text-muted">Opening Balance:</small><br />
                <strong class="fs-5">$${balance}</strong>
              </p>
              <small class="text-muted d-block mt-2">ID: ${id}</small>
            </div>
            <div class="card-footer bg-light" onclick="event.stopPropagation();">
              <button
                class="btn btn-sm btn-primary w-100"
                onclick="openEditModal(${id}, '${name}', '${type}', ${balance})"
              >
                <i class="bi bi-pencil me-1"></i>Edit
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

/**
 * Open the edit account modal and populate fields
 */
function openEditModal(id, name, accountType, openingBalance) {
  currentAccountId = id;
  document.getElementById('editId').value = id;
  document.getElementById('editName').value = name;
  document.getElementById('editType').value = accountType;
  document.getElementById('editBalance').value = openingBalance || 0;
  const form = document.getElementById('editAccountForm');
  form.classList.remove('was-validated');
  editModal.show();
}

/**
 * Create a new account via API
 */
async function createAccount() {
  const form = document.getElementById('addAccountForm');

  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    return;
  }

  const name = document.getElementById('addName').value.trim();
  const accountType = document.getElementById('addType').value;
  const openingBalance = parseFloat(document.getElementById('addBalance').value) || 0;

  try {
    console.log('🔍 DEBUG: Creating account', { name, accountType, openingBalance });

    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        accountType,
        openingBalance
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to create account');
    }

    console.log('✅ SUCCESS: Account created', result.data);
    window.showMessage('Account created successfully!', 'success');
    addModal.hide();
    form.reset();
    loadAccounts();
  } catch (error) {
    console.error('❌ ERROR: Failed to create account', error);
    window.showMessage(`Error creating account: ${error.message}`, 'danger', 0);
  }
}

/**
 * Update an existing account via API
 */
async function updateAccount() {
  const form = document.getElementById('editAccountForm');

  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    return;
  }

  const id = document.getElementById('editId').value;
  const name = document.getElementById('editName').value.trim();
  const accountType = document.getElementById('editType').value;
  const openingBalance = parseFloat(document.getElementById('editBalance').value) || 0;

  try {
    console.log('🔍 DEBUG: Updating account', { id, name, accountType, openingBalance });

    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        accountType,
        openingBalance
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to update account');
    }

    console.log('✅ SUCCESS: Account updated', result.data);
    window.showMessage('Account updated successfully!', 'success');
    editModal.hide();
    form.reset();
    loadAccounts();
  } catch (error) {
    console.error('❌ ERROR: Failed to update account', error);
    window.showMessage(`Error updating account: ${error.message}`, 'danger', 0);
  }
}

/**
 * Delete an account via API
 */
async function deleteAccount() {
  if (!currentAccountId) {
    window.showMessage('Error: No account selected', 'danger');
    return;
  }

  if (!confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
    return;
  }

  try {
    console.log('🔍 DEBUG: Deleting account', currentAccountId);

    const response = await fetch(`${API_BASE}/${currentAccountId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to delete account');
    }

    console.log('✅ SUCCESS: Account deleted', result.data);
    window.showMessage('Account deleted successfully!', 'success');
    editModal.hide();
    loadAccounts();
  } catch (error) {
    console.error('❌ ERROR: Failed to delete account', error);
    window.showMessage(`Error deleting account: ${error.message}`, 'danger', 0);
  }
}

/**
 * Event Listeners - Set up when page loads
 */
document.addEventListener('DOMContentLoaded', function () {
  console.log('🔍 DEBUG: Accounts page loaded, initializing...');

  addModal = new bootstrap.Modal(document.getElementById('addAccountModal'));
  editModal = new bootstrap.Modal(document.getElementById('editAccountModal'));

  loadAccounts();

  const addAccountBtn = document.getElementById('addAccountBtn');
  if (addAccountBtn) {
    addAccountBtn.addEventListener('click', createAccount);
  }

  const editAccountBtn = document.getElementById('editAccountBtn');
  if (editAccountBtn) {
    editAccountBtn.addEventListener('click', updateAccount);
  }

  const deleteAccountBtn = document.getElementById('deleteAccountBtn');
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', deleteAccount);
  }

  document.getElementById('addAccountForm').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      createAccount();
    }
  });

  document.getElementById('editAccountForm').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      updateAccount();
    }
  });

  console.log('✅ SUCCESS: Accounts page initialized');
});