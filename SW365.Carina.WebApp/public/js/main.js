
/**
 * Display a temporary alert message on the page
 * @param {string} message - Message text to display
 * @param {string} type - Alert type: 'success', 'danger', 'info', 'warning' (default: 'info')
 * @param {number} duration - Milliseconds before auto-dismissing (0 = no auto-dismiss)
 */
window.showMessage = function showMessage(message, type = 'info', duration = 5000) {
  const alertType = ['success', 'danger', 'warning'].includes(type) ? type : 'info';
  
  // Create alert container if it doesn't exist
  let container = document.getElementById('alert-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'alert-container';
    container.className = 'position-fixed top-0 start-50 translate-middle-x mt-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }

  // Create alert element
  const alertId = `alert-${Date.now()}`;
  const alert = document.createElement('div');
  alert.id = alertId;
  alert.className = `alert alert-${alertType} alert-dismissible fade show`;
  alert.setAttribute('role', 'alert');
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;

  container.appendChild(alert);

  // Auto-dismiss if duration is set
  if (duration > 0) {
    setTimeout(() => {
      const element = document.getElementById(alertId);
      if (element) {
        element.remove();
      }
    }, duration);
  }

  // Also log to console for debugging
  console.log(`[${alertType.toUpperCase()}] ${message}`);
};
