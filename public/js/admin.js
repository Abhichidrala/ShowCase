/* =========================================
   Admin Panel — Client JS
   Sidebar toggle, confirmations, toasts
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initDeleteConfirmations();
  initAlertAutoDismiss();
  initColorPicker();
  initSuccessToast();
});

// --- Sidebar toggle for mobile ---
function initSidebar() {
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('adminSidebar');
  const close = document.getElementById('sidebarClose');

  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
    });
  }

  if (close && sidebar) {
    close.addEventListener('click', () => {
      sidebar.classList.remove('active');
    });
  }

  // Close sidebar on outside click (mobile)
  document.addEventListener('click', (e) => {
    if (sidebar && sidebar.classList.contains('active')) {
      if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
        sidebar.classList.remove('active');
      }
    }
  });
}

// --- Delete confirmations ---
function initDeleteConfirmations() {
  document.querySelectorAll('.delete-form').forEach(form => {
    form.addEventListener('submit', (e) => {
      if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
        e.preventDefault();
      }
    });
  });
}

// --- Auto-dismiss alerts ---
function initAlertAutoDismiss() {
  document.querySelectorAll('.alert-success').forEach(alert => {
    setTimeout(() => {
      alert.style.transition = 'opacity 0.3s, transform 0.3s';
      alert.style.opacity = '0';
      alert.style.transform = 'translateY(-10px)';
      setTimeout(() => alert.remove(), 300);
    }, 4000);
  });
}

// --- Color picker sync ---
function initColorPicker() {
  const picker = document.getElementById('accent_color_picker');
  const input = document.getElementById('accent_color');

  if (picker && input) {
    picker.addEventListener('input', () => {
      input.value = picker.value;
    });

    input.addEventListener('input', () => {
      if (/^#[0-9A-Fa-f]{6}$/.test(input.value)) {
        picker.value = input.value;
      }
    });
  }
}

// --- Show toast on success query param ---
function initSuccessToast() {
  const params = new URLSearchParams(window.location.search);
  const success = params.get('success');
  const error = params.get('error');

  if (success) {
    showToast(success, 'success');
    // Clean URL
    const url = new URL(window.location);
    url.searchParams.delete('success');
    window.history.replaceState({}, '', url);
  }

  if (error) {
    showToast(error, 'error');
    const url = new URL(window.location);
    url.searchParams.delete('error');
    window.history.replaceState({}, '', url);
  }
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
