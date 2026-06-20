/**
 * Add Account Page - Form Submission Handler
 */

const API_BASE = '/api/accounts';

/**
 * Handle form submission for creating a new account
 */
async function handleAddAccountSubmit(e) {
  e.preventDefault();

  const form = document.getElementById('addAccountForm');

  // Validate form
  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    return;
  }

  const name = document.getElementById('addName').value.trim();
  const accountType = document.getElementById('addType').value;
  const openingBalance = Number(document.getElementById('addBalance').value || 0);

  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        accountType,
        openingBalance,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to create account');
    }

    window.showMessage('Account created successfully!', 'success');

    // Redirect back to accounts page after a short delay
    setTimeout(() => {
      window.location.href = '/pages/accounts.html';
    }, 1000);
  } catch (error) {
    console.error('Failed to create account', error);
    window.showMessage(`Error creating account: ${error.message}`, 'danger', 0);
  }
}

/**
 * Event Listeners - Set up when page loads
 */
document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('addAccountForm');
  if (form) {
    form.addEventListener('submit', handleAddAccountSubmit);
  }

  // Allow pressing Enter to submit form
  document.getElementById('addName')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }
  });
});
