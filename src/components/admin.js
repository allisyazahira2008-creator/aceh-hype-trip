import { IMAGES } from '../data/seed.js';
import { TRANSLATIONS } from '../i18n/translations.js';
import { persistKey, resetAllData, state } from '../state/store.js';
import { escapeHtml, sanitizeImageUrl } from '../utils/escapeHtml.js';
import { formatMoney } from '../utils/format.js';
import { STORAGE_KEYS } from '../utils/storage.js';
import { openAuthModal } from './auth.js';
import { openModal } from './modal.js';
import { showToast } from './toast.js';

const TYPE_TO_KEY = {
  destinations: STORAGE_KEYS.destinations,
  foods: STORAGE_KEYS.foods,
  stays: STORAGE_KEYS.stays,
  packages: STORAGE_KEYS.packages,
};

function isManagerSignedIn() {
  return state.currentUser?.role === 'admin';
}

export function renderAdminAccessState() {
  const gateEl = document.getElementById('adminAuthGate');
  const workspaceEl = document.getElementById('adminWorkspace');
  const resetSeedBtn = document.getElementById('resetSeedData');
  if (!gateEl || !workspaceEl) return;

  const isAdmin = isManagerSignedIn();
  const isEn = state.language === 'en';

  gateEl.hidden = isAdmin;
  workspaceEl.hidden = !isAdmin;
  if (resetSeedBtn) resetSeedBtn.hidden = !isAdmin;

  if (!isAdmin) {
    const loggedInTraveler = state.currentUser && state.currentUser.role !== 'admin';
    gateEl.innerHTML = `
      <div class="auth-gate-box">
        <div>
          <h3>${
            isEn ? 'Manager Demo Sign-In Required' : 'Masuk sebagai Pengelola Demo'
          }</h3>
          <p class="helper-text" style="margin-top:6px">
            ${
              loggedInTraveler
                ? isEn
                  ? `You are currently signed in as ${escapeHtml(
                      state.currentUser.name
                    )} (Traveler). Switch to the Manager demo account to add, edit, or delete catalog entries.`
                  : `Anda saat ini masuk sebagai ${escapeHtml(
                      state.currentUser.name
                    )} (Wisatawan). Beralihlah ke akun Pengelola Demo untuk menambah, mengedit, atau menghapus data katalog.`
                : isEn
                ? 'Sign in with the Manager demo account (admin@acehhypetrip.demo / admin2026) to manage destinations, culinary, stays, and packages.'
                : 'Masuk menggunakan akun Pengelola Demo (admin@acehhypetrip.demo / admin2026) untuk mengelola data destinasi, kuliner, akomodasi, dan paket wisata.'
            }
          </p>
        </div>
        <button type="button" class="btn btn-primary" data-action="open-admin-login">
          ${isEn ? 'Sign In as Manager' : 'Masuk Akun Pengelola'}
        </button>
      </div>
    `;
  }
}

function getActiveCollection() {
  return state[state.adminType] || [];
}

function setActiveCollection(list) {
  state[state.adminType] = list;
  persistKey(TYPE_TO_KEY[state.adminType], list);
}

export function updateAdminFormLabels() {
  const t = TRANSLATIONS[state.language];
  const isEdit = Boolean(document.getElementById('editId')?.value);
  const titleEl = document.getElementById('adminFormTitle');
  const submitEl = document.getElementById('adminSubmitBtn');
  const regionWrap = document.getElementById('adminRegionWrap');
  const categoryLabel = document.getElementById('adminCategoryLabel');
  const categoryInput = document.getElementById('adminCategory');

  if (titleEl) {
    titleEl.textContent = isEdit ? t.adminEditTitle : t.adminAddTitle;
  }
  if (submitEl) {
    submitEl.textContent = isEdit ? t.updateDataBtn : t.saveDataBtn;
  }

  if (state.adminType === 'packages') {
    if (regionWrap) regionWrap.hidden = true;
    if (categoryLabel) categoryLabel.textContent = t.formDurationLabel;
    if (categoryInput) categoryInput.placeholder = '1 - 5';
  } else {
    if (regionWrap) regionWrap.hidden = false;
    if (categoryLabel) categoryLabel.textContent = t.formCategoryLabel;
    if (categoryInput) {
      categoryInput.placeholder =
        state.adminType === 'foods' ? 'Kuliner lokal' : state.adminType === 'stays' ? 'Guesthouse' : 'alam';
    }
  }
}

export function renderAdminList() {
  const listEl = document.getElementById('adminList');
  const countEl = document.getElementById('adminCount');
  if (!listEl) return;

  const t = TRANSLATIONS[state.language];
  const items = getActiveCollection();

  if (countEl) {
    countEl.textContent = `${items.length} ${state.language === 'en' ? 'items' : 'entri'}`;
  }

  if (!items.length) {
    listEl.innerHTML = `<p class="helper-text">${
      state.language === 'en' ? 'No entries yet.' : 'Belum ada data.'
    }</p>`;
    return;
  }

  listEl.innerHTML = items
    .map((item) => {
      const priceVal = item.estimasiBiaya ?? item.harga ?? item.hargaPerMalam ?? 0;
      const subtitle = item.wilayah
        ? `${item.wilayah} · ${formatMoney(priceVal, state.language)}`
        : `${item.durasi || 1} ${t.daysUnit} · ${formatMoney(priceVal, state.language)}`;

      return `
        <div class="admin-row">
          <div>
            <div class="admin-row-title">${escapeHtml(item.nama)}</div>
            <div class="admin-row-meta tabular-nums">${escapeHtml(subtitle)}</div>
          </div>
          <div class="admin-row-actions">
            <button type="button" class="btn btn-sm btn-secondary" data-action="edit" data-id="${escapeHtml(item.id)}">
              ${escapeHtml(t.editBtn)}
            </button>
            <button type="button" class="btn btn-sm btn-secondary" data-action="delete" data-id="${escapeHtml(item.id)}">
              ${escapeHtml(t.deleteBtn)}
            </button>
          </div>
        </div>
      `;
    })
    .join('');
}

function resetAdminForm() {
  const form = document.getElementById('adminForm');
  const editId = document.getElementById('editId');
  const errorEl = document.getElementById('adminFormError');
  form?.reset();
  if (editId) editId.value = '';
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }
  updateAdminFormLabels();
}

export function initAdminModule({ onDataChanged }) {
  const tabsEl = document.getElementById('adminTabs');
  const formEl = document.getElementById('adminForm');
  const listEl = document.getElementById('adminList');
  const resetBtn = document.getElementById('resetForm');
  const resetSeedBtn = document.getElementById('resetSeedData');
  const errorEl = document.getElementById('adminFormError');

  tabsEl?.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-type]');
    if (!btn) return;
    state.adminType = btn.dataset.type;

    tabsEl.querySelectorAll('button[data-type]').forEach((tab) => {
      const active = tab === btn;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });

    resetAdminForm();
    renderAdminList();
  });

  formEl?.addEventListener('submit', (event) => {
    event.preventDefault();
    const isEn = state.language === 'en';

    const editId = document.getElementById('editId')?.value.trim();
    const name = document.getElementById('adminName')?.value.trim();
    const region = document.getElementById('adminRegion')?.value.trim();
    const category = document.getElementById('adminCategory')?.value.trim();
    const price = Math.max(0, Number(document.getElementById('adminPrice')?.value) || 0);
    const desc = document.getElementById('adminDesc')?.value.trim();
    const rawImage = document.getElementById('adminImage')?.value.trim();

    if (!name || (state.adminType !== 'packages' && !region)) {
      if (errorEl) {
        errorEl.textContent = isEn
          ? 'Please fill in all required fields.'
          : 'Mohon lengkapi kolom wajib terlebih dahulu.';
        errorEl.hidden = false;
      }
      return;
    }

    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = '';
    }

    const list = getActiveCollection();
    const existing = editId ? list.find((item) => item.id === editId) : null;
    const id = existing ? existing.id : `item_${Date.now()}`;

    let record;
    if (state.adminType === 'destinations') {
      record = {
        ...existing,
        id,
        nama: name,
        wilayah: region,
        kategori: (category || 'alam').toLowerCase(),
        estimasiBiaya: price,
        deskripsi: desc || (isEn ? 'Destination entry.' : 'Deskripsi destinasi.'),
        imageUrl: sanitizeImageUrl(rawImage, existing?.imageUrl || IMAGES.heritage),
        alamat: existing?.alamat || `${region}, Aceh`,
        fasilitas: existing?.fasilitas || ['Area publik'],
        fasilitasIbadah:
          existing?.fasilitasIbadah ||
          (isEn ? 'Needs local verification.' : 'Fasilitas ibadah perlu dikonfirmasi.'),
      };
    } else if (state.adminType === 'foods') {
      record = {
        ...existing,
        id,
        nama: name,
        wilayah: region,
        kategori: category || 'Kuliner lokal',
        harga: price,
        imageUrl: sanitizeImageUrl(rawImage, existing?.imageUrl || IMAGES.culinary),
        statusSertifikasiHalal: existing?.statusSertifikasiHalal || 'Belum diverifikasi',
        sumberVerifikasi: existing?.sumberVerifikasi || 'Belum tersedia',
        kontak: existing?.kontak || 'DEMO',
      };
    } else if (state.adminType === 'stays') {
      record = {
        ...existing,
        id,
        nama: name,
        wilayah: region,
        hargaPerMalam: price,
        imageUrl: sanitizeImageUrl(rawImage, existing?.imageUrl || IMAGES.stay),
        fasilitas: existing?.fasilitas || ['Wi-Fi', 'Parkir'],
        fasilitasRamahMuslim: existing?.fasilitasRamahMuslim || [
          'Konfirmasi fasilitas kepada pengelola',
        ],
        kontak: existing?.kontak || 'DEMO',
      };
    } else {
      const duration = Math.min(5, Math.max(1, Number(category) || existing?.durasi || 2));
      record = {
        ...existing,
        id,
        nama: name,
        durasi: duration,
        estimasiBiaya: price,
        deskripsi: desc || (isEn ? 'Curated Aceh travel package.' : 'Paket perjalanan Aceh.'),
        kategori: existing?.kategori || 'alam',
        daftarDestinasi: existing?.daftarDestinasi || [],
      };
    }

    const updated = existing
      ? list.map((item) => (item.id === id ? record : item))
      : [...list, record];

    setActiveCollection(updated);
    resetAdminForm();
    onDataChanged?.();
    showToast(isEn ? 'Entry saved' : 'Data berhasil disimpan');
  });

  resetBtn?.addEventListener('click', resetAdminForm);

  listEl?.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    const item = getActiveCollection().find((x) => x.id === id);
    if (!item) return;

    if (btn.dataset.action === 'edit') {
      document.getElementById('editId').value = item.id;
      document.getElementById('adminName').value = item.nama || '';
      document.getElementById('adminRegion').value = item.wilayah || '';
      document.getElementById('adminCategory').value = item.kategori || item.durasi || '';
      document.getElementById('adminPrice').value = String(
        item.estimasiBiaya ?? item.harga ?? item.hargaPerMalam ?? 0
      );
      document.getElementById('adminDesc').value = item.deskripsi || '';
      document.getElementById('adminImage').value = item.imageUrl || '';
      updateAdminFormLabels();
      formEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    if (btn.dataset.action === 'delete') {
      const isEn = state.language === 'en';
      openModal({
        title: isEn ? 'Delete Entry' : 'Hapus Data',
        bodyHtml: `<p>${
          isEn
            ? `Are you sure you want to remove "${escapeHtml(item.nama)}"?`
            : `Yakin ingin menghapus "${escapeHtml(item.nama)}" dari daftar?`
        }</p>`,
        actions: [
          {
            label: isEn ? 'Delete' : 'Hapus',
            variant: 'btn-danger',
            onClick: () => {
              const filtered = getActiveCollection().filter((x) => x.id !== id);
              setActiveCollection(filtered);
              if (document.getElementById('editId')?.value === id) {
                resetAdminForm();
              }
              onDataChanged?.();
              showToast(isEn ? 'Entry deleted' : 'Data dihapus');
            },
          },
          {
            label: isEn ? 'Cancel' : 'Batal',
            variant: 'btn-secondary',
          },
        ],
      });
    }
  });

  resetSeedBtn?.addEventListener('click', () => {
    const isEn = state.language === 'en';
    openModal({
      title: isEn ? 'Restore Default Data' : 'Pulihkan Data Awal',
      bodyHtml: `<p>${
        isEn
          ? 'This will reset local edits, saved favorites, and stored itineraries back to the initial dataset.'
          : 'Tindakan ini akan mengembalikan seluruh perubahan lokal, favorit, dan itinerary tersimpan ke data awal.'
      }</p>`,
      actions: [
        {
          label: isEn ? 'Restore Defaults' : 'Pulihkan',
          variant: 'btn-danger',
          onClick: () => {
            resetAllData();
            resetAdminForm();
            onDataChanged?.();
            showToast(isEn ? 'Default data restored' : 'Data awal dipulihkan');
          },
        },
        {
          label: isEn ? 'Cancel' : 'Batal',
          variant: 'btn-secondary',
        },
      ],
    });
  });

  const gateEl = document.getElementById('adminAuthGate');
  gateEl?.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action="open-admin-login"]');
    if (btn) {
      openAuthModal('login');
    }
  });

  renderAdminAccessState();
  updateAdminFormLabels();
}
