import { escapeHtml, sanitizeImageUrl } from '../utils/escapeHtml.js';

export function renderMediaFrame(rawUrl, altText, fallbackTitle) {
  const safeUrl = sanitizeImageUrl(rawUrl);
  const safeAlt = escapeHtml(altText);
  const safeFallback = escapeHtml(fallbackTitle || altText);
  const brokenClass = safeUrl ? '' : ' is-broken';

  return `
    <div class="media-frame${brokenClass}">
      ${
        safeUrl
          ? `<img src="${escapeHtml(safeUrl)}" alt="${safeAlt}" loading="lazy" referrerpolicy="no-referrer" />`
          : ''
      }
      <div class="media-fallback" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
          <path d="M3 18l6-6 4 4 3-3 5 5" />
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9" r="1.5" />
        </svg>
        <span>${safeFallback}</span>
      </div>
    </div>
  `;
}

export function attachImageFallbacks(root = document) {
  root.querySelectorAll('.media-frame img').forEach((img) => {
    if (img.dataset.boundFallback === '1') return;
    img.dataset.boundFallback = '1';
    img.addEventListener('error', () => {
      img.closest('.media-frame')?.classList.add('is-broken');
    });
  });
}
