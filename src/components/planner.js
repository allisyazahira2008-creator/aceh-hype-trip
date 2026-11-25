import { TRANSLATIONS } from '../i18n/translations.js';
import { state } from '../state/store.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { formatCategory, formatMoney, formatRupiah } from '../utils/format.js';
import { STORAGE_KEYS, loadFromStorage, saveToStorage } from '../utils/storage.js';
import { showToast } from './toast.js';

function resizeItineraryDays(dayCount) {
  const safeCount = Math.min(5, Math.max(1, Number(dayCount) || 1));
  const next = [];
  for (let i = 0; i < safeCount; i += 1) {
    next.push(Array.isArray(state.itineraryDays[i]) ? [...state.itineraryDays[i]] : []);
  }
  state.itineraryDays = next;
}

function getDestinationById(id) {
  return state.destinations.find((d) => d.id === id);
}

function calculateItineraryTicketTotal() {
  const travelers = Math.max(1, Number(document.getElementById('people')?.value) || 1);
  let perPerson = 0;
  state.itineraryDays.forEach((dayIds) => {
    dayIds.forEach((id) => {
      const dest = getDestinationById(id);
      if (dest) {
        perPerson += Number(dest.estimasiBiaya) || 0;
      }
    });
  });
  return { perPerson, total: perPerson * travelers, travelers };
}

export function renderDayBuilder() {
  const container = document.getElementById('dayLists');
  const metricEl = document.getElementById('itineraryTicketTotal');
  if (!container) return;

  const dayCount = Number(document.getElementById('days')?.value) || 3;
  resizeItineraryDays(dayCount);

  const isEn = state.language === 'en';
  const optionsHtml = state.destinations
    .map(
      (d) =>
        `<option value="${escapeHtml(d.id)}">${escapeHtml(d.nama)} — ${escapeHtml(d.wilayah)} (${escapeHtml(
          formatMoney(d.estimasiBiaya, state.language)
        )})</option>`
    )
    .join('');

  container.innerHTML = state.itineraryDays
    .map((destIds, dayIdx) => {
      const dayTicketSum = destIds.reduce((sum, id) => {
        const d = getDestinationById(id);
        return sum + (Number(d?.estimasiBiaya) || 0);
      }, 0);

      const stopsHtml = destIds.length
        ? destIds
            .map((id, stopIdx) => {
              const dest = getDestinationById(id);
              if (!dest) return '';
              return `
                <li class="day-stop-item">
                  <div>
                    <strong>${escapeHtml(dest.nama)}</strong>
                    <div class="day-stop-meta">
                      ${escapeHtml(dest.wilayah)} · ${escapeHtml(formatMoney(dest.estimasiBiaya, state.language))}
                    </div>
                  </div>
                  <button
                    type="button"
                    class="remove-stop-btn"
                    data-action="remove-stop"
                    data-day="${dayIdx}"
                    data-index="${stopIdx}"
                    aria-label="${isEn ? `Remove ${dest.nama}` : `Hapus ${dest.nama}`}"
                  >
                    ×
                  </button>
                </li>
              `;
            })
            .join('')
        : `<li class="helper-text" style="margin:0">${
            isEn ? 'No destinations added yet.' : 'Belum ada destinasi dipilih.'
          }</li>`;

      return `
        <div class="day-card">
          <div class="day-card-head">
            <span class="day-card-title">${isEn ? `Day ${dayIdx + 1}` : `Hari ${dayIdx + 1}`}</span>
            <span class="day-cost tabular-nums">${isEn ? 'Entry est.' : 'Tiket'}: ${escapeHtml(
              formatMoney(dayTicketSum, state.language)
            )}/${isEn ? 'pax' : 'org'}</span>
          </div>
          <div class="day-add-row">
            <select class="day-picker" data-day="${dayIdx}" aria-label="${
        isEn ? `Select destination for day ${dayIdx + 1}` : `Pilih destinasi hari ${dayIdx + 1}`
      }">
              <option value="">${isEn ? 'Choose destination...' : 'Pilih destinasi...'}</option>
              ${optionsHtml}
            </select>
            <button type="button" class="btn btn-sm btn-secondary" data-action="add-stop" data-day="${dayIdx}">
              ${isEn ? '+ Add' : '+ Tambah'}
            </button>
          </div>
          <ul class="day-stops">${stopsHtml}</ul>
        </div>
      `;
    })
    .join('');

  if (metricEl) {
    const { total, travelers } = calculateItineraryTicketTotal();
    metricEl.textContent = isEn
      ? `Entry est. (${travelers} pax): ${formatRupiah(total)}`
      : `Est. tiket (${travelers} org): ${formatRupiah(total)}`;
  }
}

export function addDestinationToDay(destId, dayIndex = 0) {
  if (!getDestinationById(destId)) return;
  if (!state.itineraryDays[dayIndex]) {
    resizeItineraryDays(dayIndex + 1);
  }
  if (!state.itineraryDays[dayIndex].includes(destId)) {
    state.itineraryDays[dayIndex].push(destId);
  }
  renderDayBuilder();
  document.getElementById('planner')?.scrollIntoView({ behavior: 'smooth' });
  showToast(
    state.language === 'en'
      ? `Added to Day ${dayIndex + 1} itinerary`
      : `Ditambahkan ke Hari ${dayIndex + 1} itinerary`
  );
}

export function renderBudgetCalculation() {
  const resultEl = document.getElementById('budgetResult');
  if (!resultEl) return;

  const people = Math.max(1, Number(document.getElementById('budgetPeople')?.value) || 1);
  const days = Math.max(1, Number(document.getElementById('budgetDays')?.value) || 1);
  const transport = Math.max(0, Number(document.getElementById('transport')?.value) || 0);
  const hotelPerNight = Math.max(0, Number(document.getElementById('hotel')?.value) || 0);
  const mealPerPersonDay = Math.max(0, Number(document.getElementById('meal')?.value) || 0);
  const activityPerPerson = Math.max(0, Number(document.getElementById('activity')?.value) || 0);

  const nights = Math.max(0, days - 1);
  const lodgingTotal = hotelPerNight * nights;
  const foodTotal = mealPerPersonDay * people * days;
  const activityTotal = activityPerPerson * people;
  const grandTotal = transport + lodgingTotal + foodTotal + activityTotal;
  const perPerson = grandTotal / people;

  const isEn = state.language === 'en';
  resultEl.innerHTML = `
    <div class="budget-total-row">
      <span class="budget-total-label">${isEn ? 'Total estimated budget' : 'Total estimasi anggaran'}</span>
      <span class="budget-total-amount tabular-nums">${escapeHtml(formatRupiah(grandTotal))}</span>
    </div>
    <ul class="budget-breakdown">
      <li>
        <span>${isEn ? 'Transport (total)' : 'Transportasi (total)'}</span>
        <span class="amount tabular-nums">${escapeHtml(formatRupiah(transport))}</span>
      </li>
      <li>
        <span>${isEn ? `Accommodation (${nights} nights)` : `Akomodasi (${nights} malam)`}</span>
        <span class="amount tabular-nums">${escapeHtml(formatRupiah(lodgingTotal))}</span>
      </li>
      <li>
        <span>${isEn ? `Meals (${people} pax × ${days} days)` : `Makan (${people} org × ${days} hari)`}</span>
        <span class="amount tabular-nums">${escapeHtml(formatRupiah(foodTotal))}</span>
      </li>
      <li>
        <span>${isEn ? `Activities (${people} pax)` : `Aktivitas (${people} org)`}</span>
        <span class="amount tabular-nums">${escapeHtml(formatRupiah(activityTotal))}</span>
      </li>
      <li>
        <strong>${isEn ? 'Estimated per person' : 'Estimasi per orang'}</strong>
        <strong class="amount tabular-nums">${escapeHtml(formatRupiah(perPerson))}</strong>
      </li>
    </ul>
  `;
}

export function renderRecommendations() {
  const container = document.getElementById('recommendations');
  if (!container) return;

  const t = TRANSLATIONS[state.language];
  const interest = document.getElementById('interest')?.value || 'all';
  const maxBudget = Number(document.getElementById('maxBudget')?.value) || 0;

  const found = state.packages.filter(
    (pkg) =>
      (interest === 'all' || pkg.kategori === interest) &&
      (Number(pkg.estimasiBiaya) || 0) <= maxBudget
  );

  if (!found.length) {
    container.innerHTML = `<div class="empty-state"><p>${escapeHtml(t.noPackages)}</p></div>`;
    return;
  }

  container.innerHTML = found
    .map((pkg) => {
      const stopNames = (pkg.daftarDestinasi || [])
        .map((id) => getDestinationById(id)?.nama)
        .filter(Boolean)
        .join(' · ');

      return `
        <article class="card">
          <div class="card-body">
            <p class="meta-line">
              <span class="tabular-nums">${escapeHtml(pkg.durasi)} ${escapeHtml(t.daysUnit)}</span>
              <span aria-hidden="true">·</span>
              <span>${escapeHtml(formatCategory(pkg.kategori, state.language))}</span>
            </p>
            <h3 class="card-title">${escapeHtml(pkg.nama)}</h3>
            <p class="card-desc">${escapeHtml(pkg.deskripsi)}</p>
            ${
              stopNames
                ? `<div class="detail-list"><div><strong>${
                    state.language === 'en' ? 'Includes' : 'Termasuk'
                  }:</strong> ${escapeHtml(stopNames)}</div></div>`
                : ''
            }
            <div class="card-footer">
              <div class="price-row">
                <span class="price-value tabular-nums">${escapeHtml(formatRupiah(pkg.estimasiBiaya))}</span>
                <span class="price-note">${escapeHtml(t.simPriceNote)}</span>
              </div>
              <div class="card-actions">
                <button
                  type="button"
                  class="btn btn-sm btn-primary"
                  data-action="apply-package"
                  data-id="${escapeHtml(pkg.id)}"
                >
                  ${escapeHtml(t.applyPackageBtn)}
                </button>
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

export function initPlannerModule() {
  const tripDateEl = document.getElementById('tripDate');
  const daysEl = document.getElementById('days');
  const peopleEl = document.getElementById('people');
  const dayListsEl = document.getElementById('dayLists');
  const statusEl = document.getElementById('tripStatus');

  if (tripDateEl && !tripDateEl.value) {
    tripDateEl.value = new Date().toISOString().slice(0, 10);
  }

  daysEl?.addEventListener('change', renderDayBuilder);
  peopleEl?.addEventListener('input', renderDayBuilder);

  dayListsEl?.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;
    const dayIdx = Number(btn.dataset.day);

    if (btn.dataset.action === 'add-stop') {
      const picker = dayListsEl.querySelector(`.day-picker[data-day="${dayIdx}"]`);
      const destId = picker?.value;
      if (!destId) {
        showToast(state.language === 'en' ? 'Select a destination first' : 'Pilih destinasi terlebih dahulu');
        return;
      }
      if (!state.itineraryDays[dayIdx].includes(destId)) {
        state.itineraryDays[dayIdx].push(destId);
        renderDayBuilder();
      } else {
        showToast(state.language === 'en' ? 'Already in this day' : 'Sudah ada pada hari ini');
      }
      return;
    }

    if (btn.dataset.action === 'remove-stop') {
      const stopIdx = Number(btn.dataset.index);
      state.itineraryDays[dayIdx]?.splice(stopIdx, 1);
      renderDayBuilder();
    }
  });

  document.getElementById('saveTrip')?.addEventListener('click', () => {
    const trip = {
      id: `trip_${Date.now()}`,
      namaPerjalanan: document.getElementById('tripName')?.value.trim() || 'Aceh Holiday',
      tanggalMulai: tripDateEl?.value || '',
      jumlahHari: Number(daysEl?.value) || 3,
      jumlahWisatawan: Math.max(1, Number(peopleEl?.value) || 1),
      daftarAktivitas: state.itineraryDays.map((destinasi, idx) => ({
        hari: idx + 1,
        destinasi: [...destinasi],
      })),
    };
    saveToStorage(STORAGE_KEYS.itinerary, trip);
    if (statusEl) {
      statusEl.textContent =
        state.language === 'en'
          ? 'Itinerary saved to browser storage.'
          : 'Itinerary berhasil disimpan di penyimpanan browser.';
    }
    showToast(state.language === 'en' ? 'Itinerary saved' : 'Itinerary tersimpan');
  });

  document.getElementById('loadTrip')?.addEventListener('click', () => {
    const saved = loadFromStorage(STORAGE_KEYS.itinerary, null);
    if (!saved || !saved.namaPerjalanan) {
      showToast(state.language === 'en' ? 'No saved itinerary found' : 'Belum ada itinerary tersimpan');
      return;
    }
    const tripNameEl = document.getElementById('tripName');
    if (tripNameEl) tripNameEl.value = saved.namaPerjalanan;
    if (tripDateEl && saved.tanggalMulai) tripDateEl.value = saved.tanggalMulai;
    if (daysEl) daysEl.value = String(Math.min(5, Math.max(1, Number(saved.jumlahHari) || 3)));
    if (peopleEl) peopleEl.value = String(Math.max(1, Number(saved.jumlahWisatawan) || 2));

    const daysCount = Number(daysEl?.value) || 3;
    state.itineraryDays = Array.from({ length: daysCount }, (_, i) => {
      const match = saved.daftarAktivitas?.find((a) => a.hari === i + 1);
      return Array.isArray(match?.destinasi) ? [...match.destinasi] : [];
    });

    renderDayBuilder();
    if (statusEl) {
      statusEl.textContent =
        state.language === 'en' ? 'Saved itinerary loaded.' : 'Itinerary tersimpan berhasil dimuat.';
    }
    showToast(state.language === 'en' ? 'Itinerary loaded' : 'Itinerary dimuat');
  });

  document.getElementById('copyTrip')?.addEventListener('click', async () => {
    const name = document.getElementById('tripName')?.value.trim() || 'Aceh Holiday';
    const date = tripDateEl?.value || '-';
    const lines = [`${name} (${date})`];
    state.itineraryDays.forEach((ids, idx) => {
      const names = ids.map((id) => getDestinationById(id)?.nama).filter(Boolean);
      lines.push(`Hari ${idx + 1}: ${names.length ? names.join(', ') : '-'}`);
    });
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      showToast(state.language === 'en' ? 'Itinerary copied' : 'Ringkasan itinerary disalin');
    } catch {
      showToast(state.language === 'en' ? 'Clipboard unavailable' : 'Clipboard tidak tersedia');
    }
  });

  document.getElementById('syncFromTrip')?.addEventListener('click', () => {
    const { perPerson, travelers } = calculateItineraryTicketTotal();
    const days = Number(daysEl?.value) || 3;

    const bPeople = document.getElementById('budgetPeople');
    const bDays = document.getElementById('budgetDays');
    const bActivity = document.getElementById('activity');

    if (bPeople) bPeople.value = String(travelers);
    if (bDays) bDays.value = String(days);
    if (bActivity && perPerson > 0) bActivity.value = String(perPerson);

    renderBudgetCalculation();
    showToast(
      state.language === 'en'
        ? 'Calculator synced from itinerary'
        : 'Kalkulator disinkronkan dari itinerary'
    );
  });

  document.getElementById('calculate')?.addEventListener('click', renderBudgetCalculation);
  document.getElementById('recommend')?.addEventListener('click', renderRecommendations);
  document.getElementById('interest')?.addEventListener('change', renderRecommendations);

  document.getElementById('recommendations')?.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action="apply-package"]');
    if (!btn) return;
    const pkg = state.packages.find((p) => p.id === btn.dataset.id);
    if (!pkg) return;

    const clampedDays = Math.min(5, Math.max(1, Number(pkg.durasi) || 2));
    if (daysEl) daysEl.value = String(clampedDays);
    const tripNameEl = document.getElementById('tripName');
    if (tripNameEl) tripNameEl.value = pkg.nama;

    const nextDays = Array.from({ length: clampedDays }, () => []);
    (pkg.daftarDestinasi || []).forEach((destId, index) => {
      nextDays[index % clampedDays].push(destId);
    });
    state.itineraryDays = nextDays;
    renderDayBuilder();

    document.getElementById('planner')?.scrollIntoView({ behavior: 'smooth' });
    showToast(
      state.language === 'en'
        ? `Applied "${pkg.nama}" to itinerary`
        : `Paket "${pkg.nama}" diterapkan ke itinerary`
    );
  });
}
