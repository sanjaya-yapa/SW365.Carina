/**
 * Accounts Page - API Integration and Event Handlers
 * Handles listing active/deleted accounts and linking to account actions.
 */

const API_BASE = '/api/accounts';
let currentView = 'active';

function normalizeAccount(account) {
  return {
    id: account.id || account.account_id,
    name: account.name || account.account_name || '',
    type: account.account_type || account.accountType || '',
    balance: Number(account.opening_balance ?? account.openingBalance ?? 0),
    isActive: account.is_active !== undefined ? account.is_active : account.isActive,
  };
}

function formatCurrency(value) {
  return Number(value || 0).toFixed(2);
}

function goToEditAccount(accountId) {
  window.location.href = `/pages/edit-account.html?id=${encodeURIComponent(accountId)}`;
}

function setViewButtonState() {
  const activeButton = document.getElementById('activeAccountsBtn');
  const deletedButton = document.getElementById('deletedAccountsBtn');

  activeButton.className = currentView === 'active' ? 'btn btn-primary' : 'btn btn-outline-primary';
  deletedButton.className =
    currentView === 'deleted' ? 'btn btn-primary' : 'btn btn-outline-primary';
}

async function reactivateAccount(accountId) {
  try {
    const response = await fetch(`${API_BASE}/${accountId}/reactivate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to reactivate account');
    }

    window.showMessage('Account reactivated successfully!', 'success');
    await loadAccounts();
  } catch (error) {
    console.error('Failed to reactivate account', error);
    window.showMessage(`Error reactivating account: ${error.message}`, 'danger', 0);
  }
}

function createAccountCard(account) {
  const normalized = normalizeAccount(account);
  const isActive = normalized.isActive === 1 || normalized.isActive === true;

  const column = document.createElement('div');
  column.className = 'col-md-4';

  const card = document.createElement('div');
  card.className = 'card h-100';

  if (isActive) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => goToEditAccount(normalized.id));
  }

  const cardBody = document.createElement('div');
  cardBody.className = 'card-body';

  const titleRow = document.createElement('div');
  titleRow.className = 'd-flex justify-content-between align-items-start mb-3';

  const title = document.createElement('h5');
  title.className = 'card-title mb-0';
  title.textContent = normalized.name;

  const statusBadge = document.createElement('span');
  statusBadge.className = isActive ? 'badge bg-success' : 'badge bg-secondary';
  statusBadge.textContent = isActive ? 'Active' : 'Deleted';

  titleRow.append(title, statusBadge);

  const typeText = document.createElement('p');
  typeText.className = 'card-text';

  const typeMuted = document.createElement('small');
  typeMuted.className = 'text-muted';
  typeMuted.append('Type: ');

  const typeStrong = document.createElement('strong');
  typeStrong.textContent = normalized.type;
  typeMuted.appendChild(typeStrong);
  typeText.appendChild(typeMuted);

  const balanceText = document.createElement('p');
  balanceText.className = 'card-text';

  const balanceLabel = document.createElement('small');
  balanceLabel.className = 'text-muted';
  balanceLabel.textContent = 'Opening Balance:';

  const balanceValue = document.createElement('strong');
  balanceValue.className = 'fs-5';
  balanceValue.textContent = `$${formatCurrency(normalized.balance)}`;

  balanceText.append(balanceLabel, document.createElement('br'), balanceValue);

  const idText = document.createElement('small');
  idText.className = 'text-muted d-block mt-2';
  idText.textContent = `ID: ${normalized.id}`;

  cardBody.append(titleRow, typeText, balanceText, idText);

  const cardFooter = document.createElement('div');
  cardFooter.className = 'card-footer bg-light';

  const actionButton = document.createElement('button');
  actionButton.type = 'button';
  actionButton.className = isActive
    ? 'btn btn-sm btn-primary w-100'
    : 'btn btn-sm btn-success w-100';
  actionButton.innerHTML = isActive
    ? '<i class="bi bi-pencil me-1"></i>Edit'
    : '<i class="bi bi-arrow-counterclockwise me-1"></i>Reactivate';

  actionButton.addEventListener('click', (event) => {
    event.stopPropagation();

    if (isActive) {
      goToEditAccount(normalized.id);
      return;
    }

    reactivateAccount(normalized.id);
  });

  cardFooter.appendChild(actionButton);
  card.append(cardBody, cardFooter);
  column.appendChild(card);

  return column;
}

function renderAccountsCards(accounts) {
  const grid = document.getElementById('accountsGrid');
  const emptyMessage = document.getElementById('emptyMessage');

  grid.replaceChildren();

  if (accounts.length === 0) {
    emptyMessage.textContent =
      currentView === 'active'
        ? 'No active accounts found. Create one to get started.'
        : 'No deleted accounts found.';
    return;
  }

  emptyMessage.textContent = '';
  accounts.forEach((account) => grid.appendChild(createAccountCard(account)));
}

async function loadAccounts() {
  try {
    setViewButtonState();

    const response = await fetch(`${API_BASE}?status=${encodeURIComponent(currentView)}`);
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to load accounts');
    }

    renderAccountsCards(result.data || []);
  } catch (error) {
    console.error('Failed to load accounts', error);
    window.showMessage(`Error loading accounts: ${error.message}`, 'danger');
    document.getElementById('emptyMessage').textContent =
      'Failed to load accounts. Please try again.';
  }
}

function switchView(nextView) {
  currentView = nextView;
  loadAccounts();
}

document.addEventListener('DOMContentLoaded', function () {
  document
    .getElementById('activeAccountsBtn')
    ?.addEventListener('click', () => switchView('active'));
  document
    .getElementById('deletedAccountsBtn')
    ?.addEventListener('click', () => switchView('deleted'));

  loadAccounts();
});
