let lastFocusedElement = null;

export function closeModal() {
  const backdrop = document.getElementById('modalBackdrop');
  if (!backdrop || backdrop.hidden) return;
  backdrop.hidden = true;
  document.getElementById('modalBody').innerHTML = '';
  document.getElementById('modalFooter').innerHTML = '';
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
    lastFocusedElement = null;
  }
}

export function openModal({ title, bodyHtml, actions = [] }) {
  const backdrop = document.getElementById('modalBackdrop');
  const titleEl = document.getElementById('modalTitle');
  const bodyEl = document.getElementById('modalBody');
  const footerEl = document.getElementById('modalFooter');
  const closeBtn = document.getElementById('modalCloseBtn');

  if (!backdrop || !titleEl || !bodyEl || !footerEl) return;

  lastFocusedElement = document.activeElement;
  titleEl.textContent = title;
  bodyEl.innerHTML = bodyHtml;
  footerEl.innerHTML = '';

  actions.forEach((action) => {
    if (action.href) {
      const link = document.createElement('a');
      link.className = `btn ${action.variant || 'btn-accent'}`;
      link.href = action.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = action.label;
      footerEl.appendChild(link);
      return;
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `btn ${action.variant || 'btn-secondary'}`;
    btn.textContent = action.label;
    btn.addEventListener('click', () => {
      if (typeof action.onClick === 'function') {
        action.onClick();
      }
      if (action.closeOnClick !== false) {
        closeModal();
      }
    });
    footerEl.appendChild(btn);
  });

  backdrop.hidden = false;
  closeBtn?.focus();
}

export function initModalListeners() {
  const backdrop = document.getElementById('modalBackdrop');
  const closeBtn = document.getElementById('modalCloseBtn');

  closeBtn?.addEventListener('click', closeModal);

  backdrop?.addEventListener('click', (event) => {
    if (event.target === backdrop) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && backdrop && !backdrop.hidden) {
      closeModal();
    }
  });
}
