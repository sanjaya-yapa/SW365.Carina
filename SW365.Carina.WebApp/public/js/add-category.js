/**
 * Add Category Page - Form Submission Handler
 */

const API_BASE = '/api/categories';

async function handleAddCategorySubmit(event) {
  event.preventDefault();

  const form = document.getElementById('addCategoryForm');

  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    return;
  }

  const name = document.getElementById('addName').value.trim();
  const categoryType = document.getElementById('addType').value;

  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        categoryType,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to create category');
    }

    window.showMessage('Category created successfully!', 'success');

    setTimeout(() => {
      window.location.href = '/pages/categories.html';
    }, 1000);
  } catch (error) {
    console.error('Failed to create category', error);
    window.showMessage(`Error creating category: ${error.message}`, 'danger', 0);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('addCategoryForm')?.addEventListener('submit', handleAddCategorySubmit);
});
