/**
 * Shared Utilities - Toast notifications, validation helpers, date formatting, loading states
 */

// ==================== Toast Notifications ====================

/**
 * Get or create the toast container element
 * @returns {HTMLElement}
 */
function getToastContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '10000';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - 'success' or 'error'
 */
function showToast(message, type = 'success') {
  const container = getToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.style.padding = '12px 20px';
  toast.style.borderRadius = '6px';
  toast.style.color = '#fff';
  toast.style.fontSize = '14px';
  toast.style.minWidth = '250px';
  toast.style.maxWidth = '400px';
  toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  toast.style.opacity = '0';
  toast.style.transform = 'translateX(100%)';

  if (type === 'success') {
    toast.style.backgroundColor = '#28a745';
  } else {
    toast.style.backgroundColor = '#dc3545';
  }

  toast.textContent = message;
  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  });

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 5000);
}

// ==================== Date Formatting ====================

/**
 * Format ISO date string to YYYY-MM-DD
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ==================== Validation Helpers ====================

/**
 * Validate that a value is non-empty after trimming
 * @param {string} value
 * @returns {boolean}
 */
function validateRequired(value) {
  return value !== null && value !== undefined && String(value).trim().length > 0;
}

/**
 * Validate that a value meets minimum length
 * @param {string} value
 * @param {number} min
 * @returns {boolean}
 */
function validateMinLength(value, min) {
  return String(value).length >= min;
}

/**
 * Validate that a value does not exceed maximum length
 * @param {string} value
 * @param {number} max
 * @returns {boolean}
 */
function validateMaxLength(value, max) {
  return String(value).length <= max;
}

// ==================== Field Error Management ====================

/**
 * Show inline error message below a form field
 * @param {HTMLElement} inputElement - The input element
 * @param {string} message - The error message
 */
function showFieldError(inputElement, message) {
  clearFieldError(inputElement);

  const errorEl = document.createElement('div');
  errorEl.className = 'field-error';
  errorEl.style.color = '#dc3545';
  errorEl.style.fontSize = '12px';
  errorEl.style.marginTop = '4px';
  errorEl.textContent = message;

  inputElement.style.borderColor = '#dc3545';
  inputElement.parentNode.insertBefore(errorEl, inputElement.nextSibling);
}

/**
 * Remove inline error from a form field
 * @param {HTMLElement} inputElement - The input element
 */
function clearFieldError(inputElement) {
  const existingError = inputElement.parentNode.querySelector('.field-error');
  if (existingError) {
    existingError.remove();
  }
  inputElement.style.borderColor = '';
}

/**
 * Remove all field errors within a form
 * @param {HTMLFormElement} form - The form element
 */
function clearAllFieldErrors(form) {
  const errors = form.querySelectorAll('.field-error');
  errors.forEach(error => error.remove());

  const inputs = form.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    input.style.borderColor = '';
  });
}

// ==================== Loading State Management ====================

/**
 * Toggle loading state on a button or element
 * @param {HTMLElement} element - The button/element
 * @param {boolean} loading - Whether to show loading state
 */
function setLoading(element, loading) {
  if (loading) {
    element.dataset.originalText = element.textContent;
    element.disabled = true;
    element.textContent = 'Loading...';
    element.style.opacity = '0.7';
    element.style.cursor = 'not-allowed';
  } else {
    element.disabled = false;
    element.textContent = element.dataset.originalText || element.textContent;
    element.style.opacity = '';
    element.style.cursor = '';
    delete element.dataset.originalText;
  }
}
