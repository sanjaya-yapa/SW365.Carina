let owners = [];
let editingOwnerId = null;
let savingOwner = false;

async function ownerRequest(url, options) {
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok || !result.success) {
    const details = Array.isArray(result.details)
      ? result.details.map((error) => error.message).join('; ')
      : '';
    throw new Error(details || result.message || 'Owner request failed');
  }
  return result.data;
}

function updateFullName() {
  document.getElementById('fullName').value = [
    document.getElementById('firstName').value.trim(),
    document.getElementById('lastName').value.trim(),
  ]
    .filter(Boolean)
    .join(' ');
}

function resetOwnerForm() {
  editingOwnerId = null;
  document.getElementById('ownerForm').reset();
  document.getElementById('ownerFormTitle').textContent = 'Add Owner';
}

function editOwner(owner) {
  editingOwnerId = owner.owner_id;
  for (const [field, value] of Object.entries({
    firstName: owner.first_name,
    lastName: owner.last_name,
    fullName: owner.full_name,
    emailAddress: owner.email_address,
    phoneNumber: owner.phone_number,
  })) {
    document.getElementById(field).value = value || '';
  }
  document.getElementById('ownerFormTitle').textContent = 'Edit Owner';
  document.getElementById('firstName').focus();
}

function renderOwners() {
  const body = document.getElementById('ownersTableBody');
  body.replaceChildren();
  owners.forEach((owner) => {
    const row = document.createElement('tr');
    for (const value of [owner.full_name, owner.email_address, owner.phone_number]) {
      const cell = document.createElement('td');
      cell.textContent = value || '';
      row.appendChild(cell);
    }
    const actions = document.createElement('td');
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'btn btn-sm btn-primary';
    editButton.textContent = 'Edit';
    editButton.disabled = savingOwner;
    editButton.addEventListener('click', () => editOwner(owner));
    actions.appendChild(editButton);
    row.appendChild(actions);
    body.appendChild(row);
  });
  document.getElementById('ownersStatus').textContent = owners.length
    ? `${owners.length} owner(s)`
    : 'No owners yet. Add an owner to get started.';
}

async function loadOwners() {
  try {
    owners = await ownerRequest('/api/transaction-owners');
    renderOwners();
    document.getElementById('saveOwnerBtn').disabled = false;
  } catch (error) {
    console.error('Failed to load owners', error);
    document.getElementById('ownersStatus').textContent =
      'Unable to load owners. Use Reload Owners to retry.';
    window.showMessage(`Error loading owners: ${error.message}`, 'danger', 0);
  }
}

function setOwnerFormBusy(busy) {
  savingOwner = busy;
  for (const control of document.querySelectorAll(
    '#ownerForm input, #ownerForm button, #reloadOwnersBtn'
  )) {
    control.disabled = busy;
  }
  renderOwners();
}

async function saveOwner(event) {
  event.preventDefault();
  const form = document.getElementById('ownerForm');
  if (savingOwner || !form.reportValidity()) return;
  const payload = {
    firstName: document.getElementById('firstName').value.trim(),
    lastName: document.getElementById('lastName').value.trim(),
    emailAddress: document.getElementById('emailAddress').value.trim() || null,
    phoneNumber: document.getElementById('phoneNumber').value.trim() || null,
  };
  const id = editingOwnerId;
  setOwnerFormBusy(true);
  try {
    const saved = await ownerRequest(
      id ? `/api/transaction-owners/${id}` : '/api/transaction-owners',
      {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    if (id) owners = owners.map((owner) => (owner.owner_id === id ? saved : owner));
    else owners.push(saved);
    owners.sort((left, right) => left.full_name.localeCompare(right.full_name));
    resetOwnerForm();
    window.showMessage('Owner saved successfully.', 'success');
  } catch (error) {
    console.error('Failed to save owner', error);
    window.showMessage(`Error saving owner: ${error.message}`, 'danger', 0);
  } finally {
    setOwnerFormBusy(false);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('ownerForm').addEventListener('submit', saveOwner);
  document.getElementById('firstName').addEventListener('input', updateFullName);
  document.getElementById('lastName').addEventListener('input', updateFullName);
  document.getElementById('cancelEditBtn').addEventListener('click', resetOwnerForm);
  document.getElementById('reloadOwnersBtn').addEventListener('click', loadOwners);
  await loadOwners();
});
