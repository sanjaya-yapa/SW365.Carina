/**
 * Edit Category Page - Form Submission Handler
 */

const API_BASE = '/api/categories';
let categoryId = null;
let deleteConfirmModal = null;

function getCategoryIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get('id'));

  return Number.isInteger(id) && id > 0 ? id : null;
}

function getCategoryValue(category, snakeName, camelName, fallback = '') {
  return category[snakeName] ?? category[camelName] ?? fallback;
}

async function loadCategory() {
  categoryId = getCategoryIdFromUrl();

  if (!categoryId) {
    window.showMessage('Missing or invalid category ID.', 'danger', 0);
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/${categoryId}`);
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to load category');
    }

    const category = result.data;
    document.getElementById('editId').value = getCategoryValue(category, 'category_id', 'id');
    document.getElementById('editName').value = getCategoryValue(category, 'category_name', 'name');
    document.getElementById('editType').value = getCategoryValue(
      category,
      'category_type',
      'categoryType'
    );
  } catch (error) {
    console.error('Failed to load category', error);
    window.showMessage(`Error loading category: ${error.message}`, 'danger', 0);
  }
}

async function handleEditCategorySubmit(event) {
  event.preventDefault();

  const form = document.getElementById('editCategoryForm');

  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    return;
  }

  const id = document.getElementById('editId').value;
  const name = document.getElementById('editName').value.trim();
  const categoryType = document.getElementById('editType').value;

  try {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        categoryType,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to update category');
    }

    window.showMessage('Category updated successfully!', 'success');

    setTimeout(() => {
      window.location.href = '/pages/categories.html';
    }, 1000);
  } catch (error) {
    console.error('Failed to update category', error);
    window.showMessage(`Error updating category: ${error.message}`, 'danger', 0);
  }
}

function showDeleteConfirmation() {
  if (!categoryId) {
    window.showMessage('Error: No category selected', 'danger');
    return;
  }

  deleteConfirmModal.show();
}

async function handleDeleteCategory() {
  try {
    const response = await fetch(`${API_BASE}/${categoryId}/deactivate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to delete category');
    }

    window.showMessage('Category deleted successfully!', 'success');
    deleteConfirmModal.hide();

    setTimeout(() => {
      window.location.href = '/pages/categories.html';
    }, 1000);
  } catch (error) {
    console.error('Failed to delete category', error);
    window.showMessage(`Error deleting category: ${error.message}`, 'danger', 0);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  deleteConfirmModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));

  loadCategory();

  document.getElementById('editCategoryForm')?.addEventListener('submit', handleEditCategorySubmit);
  document.getElementById('deleteCategoryBtn')?.addEventListener('click', showDeleteConfirmation);
  document.getElementById('confirmDeleteBtn')?.addEventListener('click', handleDeleteCategory);
});
