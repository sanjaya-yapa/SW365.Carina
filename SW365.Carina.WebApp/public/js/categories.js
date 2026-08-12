/**
 * Categories Page - API Integration and Event Handlers
 * Handles listing active/deleted categories and linking to category actions.
 */

const API_BASE = '/api/categories';
let currentView = 'active';

function normalizeCategory(category) {
  return {
    id: category.id || category.category_id,
    name: category.name || category.category_name || '',
    type: category.category_type || category.categoryType || '',
    isActive: category.is_active !== undefined ? category.is_active : category.isActive,
  };
}

function goToEditCategory(categoryId) {
  window.location.href = `/pages/edit-category.html?id=${encodeURIComponent(categoryId)}`;
}

function setViewButtonState() {
  const activeButton = document.getElementById('activeCategoriesBtn');
  const deletedButton = document.getElementById('deletedCategoriesBtn');

  activeButton.className = currentView === 'active' ? 'btn btn-primary' : 'btn btn-outline-primary';
  deletedButton.className =
    currentView === 'deleted' ? 'btn btn-primary' : 'btn btn-outline-primary';
}

async function reactivateCategory(categoryId) {
  try {
    const response = await fetch(`${API_BASE}/${categoryId}/reactivate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to reactivate category');
    }

    window.showMessage('Category reactivated successfully!', 'success');
    await loadCategories();
  } catch (error) {
    console.error('Failed to reactivate category', error);
    window.showMessage(`Error reactivating category: ${error.message}`, 'danger', 0);
  }
}

function createCategoryCard(category) {
  const normalized = normalizeCategory(category);
  const isActive = normalized.isActive === 1 || normalized.isActive === true;
  const typeBadges = {
    INCOME: { className: 'badge bg-info text-dark', label: 'Income' },
    EXPENSE: { className: 'badge bg-warning text-dark', label: 'Expense' },
    ASSET: { className: 'badge bg-success', label: 'Asset' },
  };
  const typeBadgeDetails = typeBadges[normalized.type] || {
    className: 'badge bg-secondary',
    label: normalized.type,
  };

  const column = document.createElement('div');
  column.className = 'col-md-4';

  const card = document.createElement('div');
  card.className = 'card h-100';

  if (isActive) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => goToEditCategory(normalized.id));
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

  const typeBadge = document.createElement('span');
  typeBadge.className = typeBadgeDetails.className;
  typeBadge.textContent = typeBadgeDetails.label;
  typeText.appendChild(typeBadge);

  const idText = document.createElement('small');
  idText.className = 'text-muted d-block mt-3';
  idText.textContent = `ID: ${normalized.id}`;

  cardBody.append(titleRow, typeText, idText);

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
      goToEditCategory(normalized.id);
      return;
    }

    reactivateCategory(normalized.id);
  });

  cardFooter.appendChild(actionButton);
  card.append(cardBody, cardFooter);
  column.appendChild(card);

  return column;
}

function renderCategoryCards(categories) {
  const grid = document.getElementById('categoriesGrid');
  const emptyMessage = document.getElementById('emptyMessage');

  grid.replaceChildren();

  if (categories.length === 0) {
    emptyMessage.textContent =
      currentView === 'active'
        ? 'No active categories found. Create one to get started.'
        : 'No deleted categories found.';
    return;
  }

  emptyMessage.textContent = '';
  categories.forEach((category) => grid.appendChild(createCategoryCard(category)));
}

async function loadCategories() {
  try {
    setViewButtonState();

    const response = await fetch(`${API_BASE}?status=${encodeURIComponent(currentView)}`);
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to load categories');
    }

    renderCategoryCards(result.data || []);
  } catch (error) {
    console.error('Failed to load categories', error);
    window.showMessage(`Error loading categories: ${error.message}`, 'danger');
    document.getElementById('emptyMessage').textContent =
      'Failed to load categories. Please try again.';
  }
}

function switchView(nextView) {
  currentView = nextView;
  loadCategories();
}

document.addEventListener('DOMContentLoaded', function () {
  document
    .getElementById('activeCategoriesBtn')
    ?.addEventListener('click', () => switchView('active'));
  document
    .getElementById('deletedCategoriesBtn')
    ?.addEventListener('click', () => switchView('deleted'));

  loadCategories();
});
