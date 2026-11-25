import { TRANSLATIONS } from '../i18n/translations.js';
import { state } from '../state/store.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { formatMoney } from '../utils/format.js';
import { attachImageFallbacks, renderMediaFrame } from './mediaFrame.js';
import { openModal } from './modal.js';
import { showToast } from './toast.js';

function openContactModal(name, contactNumber) {
  const isEn = state.language === 'en';
  const safeNumber = String(contactNumber || 'DEMO');

  openModal({
    title: isEn ? `Contact Info: ${name}` : `Informasi Kontak: ${name}`,
    bodyHtml: `
      <div class="modal-meta-box">
        <div><strong>${isEn ? 'Listing' : 'Nama Usaha'}:</strong> ${escapeHtml(name)}</div>
        <div><strong>${isEn ? 'Sample Phone / WhatsApp' : 'Nomor Contoh / WhatsApp'}:</strong> <span class="tabular-nums">${escapeHtml(safeNumber)}</span></div>
      </div>
      <p>
        ${
          isEn
            ? 'This phone number is sample demonstration data and not an official merchant contact. Replace with a verified partner contact before publishing.'
            : 'Nomor ini merupakan data contoh untuk demonstrasi aplikasi, bukan kontak resmi pelaku usaha. Gunakan kontak terverifikasi sebelum transaksi.'
        }
      </p>
    `,
    actions: [
      {
        label: isEn ? 'Copy Number' : 'Salin Nomor',
        variant: 'btn-primary',
        onClick: async () => {
          try {
            await navigator.clipboard.writeText(safeNumber);
            showToast(isEn ? 'Number copied to clipboard' : 'Nomor disalin ke papan klip');
          } catch {
            showToast(isEn ? 'Unable to copy automatically' : 'Tidak dapat menyalin otomatis');
          }
        },
      },
      {
        label: isEn ? 'Close' : 'Tutup',
        variant: 'btn-secondary',
      },
    ],
  });
}

export function renderFoods() {
  const grid = document.getElementById('foodGrid');
  if (!grid) return;

  const t = TRANSLATIONS[state.language];

  if (!state.foods.length) {
    grid.innerHTML = `<div class="empty-state"><p>${
      state.language === 'en' ? 'No culinary entries available.' : 'Belum ada data kuliner.'
    }</p></div>`;
    return;
  }

  grid.innerHTML = state.foods
    .map((f) => {
      const halalStatus = f.statusSertifikasiHalal || (state.language === 'en' ? 'Unverified' : 'Belum diverifikasi');
      const source = f.sumberVerifikasi || (state.language === 'en' ? 'Not available' : 'Belum tersedia');
      return `
        <article class="card">
          ${renderMediaFrame(f.imageUrl, f.nama, f.nama)}
          <div class="card-body">
            <p class="meta-line">
              <span>${escapeHtml(f.kategori)}</span>
              <span aria-hidden="true">·</span>
              <span>${escapeHtml(f.wilayah)}</span>
            </p>
            <h3 class="card-title">${escapeHtml(f.nama)}</h3>
            <div class="detail-list">
              <div>
                <strong>${escapeHtml(t.halalStatusLabel)}:</strong>
                <span class="status-text">${escapeHtml(halalStatus)}</span>
              </div>
              <div><strong>${escapeHtml(t.verifySourceLabel)}:</strong> ${escapeHtml(source)}</div>
            </div>
            <div class="card-footer">
              <div class="price-row">
                <span class="price-value tabular-nums">${escapeHtml(formatMoney(f.harga, state.language))}</span>
                <span class="price-note">${escapeHtml(t.simPriceNote)}</span>
              </div>
              <div class="card-actions">
                <button
                  type="button"
                  class="btn btn-sm btn-accent"
                  data-action="contact-merchant"
                  data-name="${escapeHtml(f.nama)}"
                  data-contact="${escapeHtml(f.kontak || 'DEMO')}"
                >
                  ${escapeHtml(t.contactUmkmBtn)}
                </button>
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  attachImageFallbacks(grid);
}

export function renderStays() {
  const grid = document.getElementById('stayGrid');
  if (!grid) return;

  const t = TRANSLATIONS[state.language];

  if (!state.stays.length) {
    grid.innerHTML = `<div class="empty-state"><p>${
      state.language === 'en' ? 'No stay entries available.' : 'Belum ada data penginapan.'
    }</p></div>`;
    return;
  }

  grid.innerHTML = state.stays
    .map((s) => {
      const facilities = (s.fasilitas || []).length ? s.fasilitas.join(', ') : '-';
      const muslimFriendly = (s.fasilitasRamahMuslim || []).length
        ? s.fasilitasRamahMuslim.join(', ')
        : '-';
      return `
        <article class="card">
          ${renderMediaFrame(s.imageUrl, s.nama, s.nama)}
          <div class="card-body">
            <p class="meta-line">
              <span>${escapeHtml(s.wilayah)}</span>
            </p>
            <h3 class="card-title">${escapeHtml(s.nama)}</h3>
            <div class="detail-list">
              <div><strong>${escapeHtml(t.facilitiesLabel)}:</strong> ${escapeHtml(facilities)}</div>
              <div><strong>${escapeHtml(t.muslimFriendlyLabel)}:</strong> ${escapeHtml(muslimFriendly)}</div>
            </div>
            <div class="card-footer">
              <div class="price-row">
                <span class="price-value tabular-nums">${escapeHtml(formatMoney(s.hargaPerMalam, state.language))}</span>
                <span class="price-note">${escapeHtml(t.perNightNote)}</span>
              </div>
              <div class="card-actions">
                <button
                  type="button"
                  class="btn btn-sm btn-accent"
                  data-action="contact-merchant"
                  data-name="${escapeHtml(s.nama)}"
                  data-contact="${escapeHtml(s.kontak || 'DEMO')}"
                >
                  ${escapeHtml(t.contactStayBtn)}
                </button>
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  attachImageFallbacks(grid);
}

export function initCulinaryAndStayModule() {
  const handleGridClick = (event) => {
    const btn = event.target.closest('button[data-action="contact-merchant"]');
    if (!btn) return;
    openContactModal(btn.dataset.name, btn.dataset.contact);
  };

  document.getElementById('foodGrid')?.addEventListener('click', handleGridClick);
  document.getElementById('stayGrid')?.addEventListener('click', handleGridClick);
}
