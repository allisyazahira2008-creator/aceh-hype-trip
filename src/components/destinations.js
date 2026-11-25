import { TRANSLATIONS } from '../i18n/translations.js';
import { isFavorite, state, toggleFavorite } from '../state/store.js';
import { buildGoogleMapsUrl, escapeHtml } from '../utils/escapeHtml.js';
import { formatCategory, formatMoney } from '../utils/format.js';
import { attachImageFallbacks, renderMediaFrame } from './mediaFrame.js';
import { openModal } from './modal.js';
import { showToast } from './toast.js';

export function populateDestinationFilters() {
  const regionSelect = document.getElementById('region');
  const categorySelect = document.getElementById('category');
  const t = TRANSLATIONS[state.language];

  const currentRegion = regionSelect.value;
  const currentCategory = categorySelect.value;

  const regions = [...new Set(state.destinations.map((d) => d.wilayah).filter(Boolean))].sort();
  const categories = [...new Set(state.destinations.map((d) => d.kategori).filter(Boolean))].sort();

  regionSelect.innerHTML =
    `<option value="">${escapeHtml(t.allRegions)}</option>` +
    regions.map((r) => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('');

  categorySelect.innerHTML =
    `<option value="">${escapeHtml(t.allCategories)}</option>` +
    categories
      .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(formatCategory(c, state.language))}</option>`)
      .join('');

  if (regions.includes(currentRegion)) regionSelect.value = currentRegion;
  if (categories.includes(currentCategory)) categorySelect.value = currentCategory;
}

export function updateFavoriteBadge() {
  const badge = document.getElementById('favCountBadge');
  const favBtn = document.getElementById('favOnly');
  if (badge) {
    badge.textContent = `(${state.favorites.length})`;
  }
  if (favBtn) {
    favBtn.setAttribute('aria-pressed', String(state.onlyFavorites));
  }
}

export function renderDestinations() {
  const grid = document.getElementById('destinationGrid');
  const countEl = document.getElementById('destCount');
  const searchEl = document.getElementById('search');
  const regionEl = document.getElementById('region');
  const categoryEl = document.getElementById('category');
  const sortEl = document.getElementById('sort');

  if (!grid) return;

  const t = TRANSLATIONS[state.language];
  const query = (searchEl?.value || '').trim().toLowerCase();
  const region = regionEl?.value || '';
  const category = categoryEl?.value || '';
  const sortBy = sortEl?.value || 'name';

  let list = state.destinations.filter((d) => {
    const haystack = `${d.nama} ${d.deskripsi} ${d.wilayah} ${d.kategori}`.toLowerCase();
    return haystack.includes(query);
  });

  if (region) {
    list = list.filter((d) => d.wilayah === region);
  }
  if (category) {
    list = list.filter((d) => d.kategori === category);
  }
  if (state.onlyFavorites) {
    list = list.filter((d) => isFavorite(d.id));
  }

  if (sortBy === 'name') {
    list.sort((a, b) => a.nama.localeCompare(b.nama));
  } else if (sortBy === 'cost') {
    list.sort((a, b) => (Number(a.estimasiBiaya) || 0) - (Number(b.estimasiBiaya) || 0));
  } else if (sortBy === 'costDesc') {
    list.sort((a, b) => (Number(b.estimasiBiaya) || 0) - (Number(a.estimasiBiaya) || 0));
  }

  updateFavoriteBadge();
  if (countEl) {
    countEl.textContent = t.showingCount(list.length, state.destinations.length);
  }

  if (!list.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(t.emptyDestinations)}</p>
        <button type="button" class="btn btn-secondary" data-action="reset-filters">
          ${escapeHtml(t.resetFilters)}
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = list
    .map((d) => {
      const fav = isFavorite(d.id);
      const facilities = (d.fasilitas || []).length ? d.fasilitas.join(', ') : '-';
      const prayer = d.fasilitasIbadah || '-';
      return `
        <article class="card">
          ${renderMediaFrame(d.imageUrl, d.nama, d.nama)}
          <div class="card-body">
            <p class="meta-line">
              <span>${escapeHtml(formatCategory(d.kategori, state.language))}</span>
              <span aria-hidden="true">·</span>
              <span>${escapeHtml(d.wilayah)}</span>
            </p>
            <h3 class="card-title">${escapeHtml(d.nama)}</h3>
            <p class="card-desc">${escapeHtml(d.deskripsi)}</p>
            <div class="detail-list">
              <div><strong>${escapeHtml(t.facilitiesLabel)}:</strong> ${escapeHtml(facilities)}</div>
              <div><strong>${escapeHtml(t.prayerLabel)}:</strong> ${escapeHtml(prayer)}</div>
            </div>
            <div class="card-footer">
              <div class="price-row">
                <span class="price-value tabular-nums">${escapeHtml(formatMoney(d.estimasiBiaya, state.language))}</span>
                <span class="price-note">${escapeHtml(t.estCostNote)}</span>
              </div>
              <div class="card-actions">
                <button
                  type="button"
                  class="btn btn-sm ${fav ? 'btn-primary' : 'btn-secondary'}"
                  data-action="toggle-fav"
                  data-id="${escapeHtml(d.id)}"
                  aria-pressed="${fav}"
                >
                  ${fav ? '♥' : '♡'} ${escapeHtml(fav ? t.removeFav : t.addFav)}
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-secondary"
                  data-action="view-detail"
                  data-id="${escapeHtml(d.id)}"
                >
                  ${escapeHtml(t.detailsBtn)}
                </button>
                <a
                  class="btn btn-sm btn-accent"
                  href="${escapeHtml(buildGoogleMapsUrl(d))}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ${escapeHtml(t.mapsBtn)}
                </a>
              </div>
              <p class="helper-text">${escapeHtml(t.verifyFootnote)}</p>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  attachImageFallbacks(grid);
}

export function openDestinationDetailModal(dest, onQuickAddItinerary) {
  const t = TRANSLATIONS[state.language];
  const facilities = (dest.fasilitas || []).length ? dest.fasilitas.join(', ') : '-';
  const address = dest.alamat || `${dest.wilayah}, Aceh`;

  openModal({
    title: dest.nama,
    bodyHtml: `
      ${renderMediaFrame(dest.imageUrl, dest.nama, dest.nama)}
      <p class="meta-line">
        <span>${escapeHtml(formatCategory(dest.kategori, state.language))}</span>
        <span aria-hidden="true">·</span>
        <span>${escapeHtml(dest.wilayah)}</span>
      </p>
      <p>${escapeHtml(dest.deskripsi)}</p>
      <div class="modal-meta-box">
        <div><strong>${state.language === 'en' ? 'Address' : 'Alamat'}:</strong> ${escapeHtml(address)}</div>
        <div><strong>${escapeHtml(t.facilitiesLabel)}:</strong> ${escapeHtml(facilities)}</div>
        <div><strong>${escapeHtml(t.prayerLabel)}:</strong> ${escapeHtml(dest.fasilitasIbadah || '-')}</div>
        <div><strong>${escapeHtml(t.estCostNote)}:</strong> <span class="tabular-nums">${escapeHtml(formatMoney(dest.estimasiBiaya, state.language))}</span></div>
      </div>
      <p class="helper-text">${escapeHtml(t.verifyFootnote)}</p>
    `,
    actions: [
      {
        label: state.language === 'en' ? 'Add to Day 1 Itinerary' : 'Tambah ke Hari 1 Itinerary',
        variant: 'btn-primary',
        onClick: () => {
          onQuickAddItinerary?.(dest.id);
        },
      },
      {
        label: t.mapsBtn,
        variant: 'btn-accent',
        href: buildGoogleMapsUrl(dest),
      },
      {
        label: state.language === 'en' ? 'Close' : 'Tutup',
        variant: 'btn-secondary',
      },
    ],
  });
}

export function initDestinationsModule({ onQuickAddItinerary }) {
  const searchEl = document.getElementById('search');
  const regionEl = document.getElementById('region');
  const categoryEl = document.getElementById('category');
  const sortEl = document.getElementById('sort');
  const favBtn = document.getElementById('favOnly');
  const grid = document.getElementById('destinationGrid');

  searchEl?.addEventListener('input', renderDestinations);
  regionEl?.addEventListener('change', renderDestinations);
  categoryEl?.addEventListener('change', renderDestinations);
  sortEl?.addEventListener('change', renderDestinations);

  favBtn?.addEventListener('click', () => {
    state.onlyFavorites = !state.onlyFavorites;
    renderDestinations();
  });

  grid?.addEventListener('click', (event) => {
    const target = event.target.closest('button[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const id = target.dataset.id;

    if (action === 'reset-filters') {
      if (searchEl) searchEl.value = '';
      if (regionEl) regionEl.value = '';
      if (categoryEl) categoryEl.value = '';
      if (sortEl) sortEl.value = 'name';
      state.onlyFavorites = false;
      renderDestinations();
      return;
    }

    if (action === 'toggle-fav' && id) {
      const saved = toggleFavorite(id);
      renderDestinations();
      showToast(
        saved
          ? state.language === 'en'
            ? 'Added to favorites'
            : 'Disimpan ke favorit'
          : state.language === 'en'
            ? 'Removed from favorites'
            : 'Dihapus dari favorit'
      );
      return;
    }

    if (action === 'view-detail' && id) {
      const dest = state.destinations.find((d) => d.id === id);
      if (dest) {
        openDestinationDetailModal(dest, onQuickAddItinerary);
      }
    }
  });
}
