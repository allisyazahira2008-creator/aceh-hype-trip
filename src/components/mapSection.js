import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { MAP_OVERVIEW, MAP_REGIONS } from '../data/seed.js';
import { TRANSLATIONS } from '../i18n/translations.js';
import { state } from '../state/store.js';
import { buildGoogleMapsUrl, escapeHtml } from '../utils/escapeHtml.js';
import { formatCategory, formatMoney } from '../utils/format.js';
import { openDestinationDetailModal, renderDestinations } from './destinations.js';

let mapInstance = null;
let infoWindowInstance = null;
let markerEntries = [];
let MarkerClass = null;
let PinClass = null;
let mapInitPromise = null;
let optionsConfigured = false;
let quickAddCallback = null;

function getMapsApiKey() {
  const viteKey = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY;
  if (typeof viteKey === 'string' && viteKey.trim()) {
    return viteKey.trim();
  }
  if (typeof __GOOGLE_MAPS_API_KEY__ === 'string' && __GOOGLE_MAPS_API_KEY__.trim()) {
    return __GOOGLE_MAPS_API_KEY__.trim();
  }
  return '';
}

function showMapFallback(message) {
  const overlay = document.getElementById('mapFallbackOverlay');
  const msgEl = document.getElementById('mapFallbackMessage');
  if (!overlay || !msgEl) return;
  msgEl.textContent = message;
  overlay.hidden = false;
}

function hideMapFallback() {
  const overlay = document.getElementById('mapFallbackOverlay');
  if (overlay) {
    overlay.hidden = true;
  }
}

function clearMarkers() {
  markerEntries.forEach(({ marker }) => {
    marker.map = null;
  });
  markerEntries = [];
}

function buildInfoWindowHeader(dest) {
  const title = document.createElement('strong');
  title.className = 'map-iw-title';
  title.textContent = dest.nama;
  return title;
}

function buildInfoWindowBody(dest) {
  const t = TRANSLATIONS[state.language];
  const wrap = document.createElement('div');
  wrap.className = 'map-iw-body';

  const meta = document.createElement('p');
  meta.className = 'map-iw-meta';
  meta.textContent = `${formatCategory(dest.kategori, state.language)} · ${dest.wilayah}`;
  wrap.appendChild(meta);

  const desc = document.createElement('p');
  desc.className = 'map-iw-desc';
  desc.textContent = dest.deskripsi || '';
  wrap.appendChild(desc);

  const cost = document.createElement('p');
  cost.className = 'map-iw-cost';
  cost.textContent = `${formatMoney(dest.estimasiBiaya, state.language)} (${t.estCostNote})`;
  wrap.appendChild(cost);

  const actions = document.createElement('div');
  actions.className = 'map-iw-actions';

  const detailBtn = document.createElement('button');
  detailBtn.type = 'button';
  detailBtn.className = 'map-iw-btn map-iw-btn-primary';
  detailBtn.textContent = t.detailsBtn;
  detailBtn.addEventListener('click', () => {
    openDestinationDetailModal(dest, quickAddCallback);
  });
  actions.appendChild(detailBtn);

  const extLink = document.createElement('a');
  extLink.className = 'map-iw-btn map-iw-btn-accent';
  extLink.href = buildGoogleMapsUrl(dest);
  extLink.target = '_blank';
  extLink.rel = 'noopener noreferrer';
  extLink.textContent = t.mapsBtn;
  actions.appendChild(extLink);

  wrap.appendChild(actions);
  return wrap;
}

function openMarkerInfoWindow(dest, marker) {
  if (!mapInstance || !infoWindowInstance || !marker) return;
  infoWindowInstance.setHeaderContent(buildInfoWindowHeader(dest));
  infoWindowInstance.setContent(buildInfoWindowBody(dest));
  infoWindowInstance.open({
    map: mapInstance,
    anchor: marker,
    shouldFocus: false,
  });
}

function syncGoogleMapMarkers() {
  if (!mapInstance || !MarkerClass || !PinClass) return;

  clearMarkers();

  const destinationsWithCoords = state.destinations.filter(
    (d) => Number.isFinite(d.lat) && Number.isFinite(d.lng)
  );

  destinationsWithCoords.forEach((dest, index) => {
    const isSelectedRegion = dest.wilayah === state.selectedMapRegion;
    const pin = new PinClass({
      background: isSelectedRegion ? '#641d32' : '#147a73',
      borderColor: '#ffffff',
      glyphColor: '#ffffff',
      glyphText: String(index + 1),
      scale: isSelectedRegion ? 1.15 : 0.96,
    });

    const marker = new MarkerClass({
      map: mapInstance,
      position: { lat: dest.lat, lng: dest.lng },
      title: `${dest.nama} — ${dest.wilayah}`,
      zIndex: isSelectedRegion ? 10 : 1,
    });
    marker.append(pin);

    marker.addListener('click', () => {
      if (dest.wilayah && dest.wilayah !== state.selectedMapRegion) {
        state.selectedMapRegion = dest.wilayah;
        renderRegionPills();
        renderRegionInspector();
      }
      openMarkerInfoWindow(dest, marker);
    });

    markerEntries.push({ dest, marker });
  });
}

function panMapToRegion(regionName) {
  if (!mapInstance) return;
  const region = MAP_REGIONS.find((item) => item.wilayah === regionName);
  if (!region) return;
  mapInstance.panTo({ lat: region.lat, lng: region.lng });
  mapInstance.setZoom(region.zoom);
}

function resetMapToOverview() {
  if (!mapInstance) return;
  infoWindowInstance?.close();
  mapInstance.panTo({ lat: MAP_OVERVIEW.lat, lng: MAP_OVERVIEW.lng });
  mapInstance.setZoom(MAP_OVERVIEW.zoom);
}

function focusDestinationOnMap(destId) {
  const entry = markerEntries.find((item) => item.dest.id === destId);
  if (!entry || !mapInstance) return;
  mapInstance.panTo({ lat: entry.dest.lat, lng: entry.dest.lng });
  mapInstance.setZoom(14);
  openMarkerInfoWindow(entry.dest, entry.marker);
}

async function ensureGoogleMapReady() {
  if (mapInstance) {
    syncGoogleMapMarkers();
    return;
  }

  if (mapInitPromise) {
    await mapInitPromise;
    return;
  }

  const canvas = document.getElementById('googleMapCanvas');
  if (!canvas) return;

  const t = TRANSLATIONS[state.language];
  const apiKey = getMapsApiKey();

  if (!apiKey) {
    showMapFallback(t.mapMissingKey);
    return;
  }

  mapInitPromise = (async () => {
    try {
      if (!optionsConfigured) {
        setOptions({
          key: apiKey,
          v: 'weekly',
          language: state.language === 'en' ? 'en' : 'id',
          region: 'ID',
        });
        optionsConfigured = true;
      }

      const [{ Map, InfoWindow }, { AdvancedMarkerElement, PinElement }] = await Promise.all([
        importLibrary('maps'),
        importLibrary('marker'),
      ]);

      MarkerClass = AdvancedMarkerElement;
      PinClass = PinElement;

      mapInstance = new Map(canvas, {
        center: { lat: MAP_OVERVIEW.lat, lng: MAP_OVERVIEW.lng },
        zoom: MAP_OVERVIEW.zoom,
        mapId: 'DEMO_MAP_ID',
        mapTypeId: state.mapTypeId || 'hybrid',
        gestureHandling: 'cooperative',
        mapTypeControl: false,
        streetViewControl: true,
        fullscreenControl: true,
        internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
      });

      infoWindowInstance = new InfoWindow({
        maxWidth: 300,
      });

      hideMapFallback();
      syncGoogleMapMarkers();
    } catch {
      showMapFallback(TRANSLATIONS[state.language].mapLoadError);
    } finally {
      mapInitPromise = null;
    }
  })();

  await mapInitPromise;
}

function renderRegionPills() {
  const pillsContainer = document.getElementById('mapRegionPills');
  if (!pillsContainer) return;

  pillsContainer.innerHTML = MAP_REGIONS.map((region) => {
    const selected = state.selectedMapRegion === region.wilayah;
    return `
      <button
        type="button"
        class="map-region-pill${selected ? ' is-selected' : ''}"
        data-region="${escapeHtml(region.wilayah)}"
        aria-pressed="${selected}"
      >
        ${escapeHtml(region.wilayah)}
      </button>
    `;
  }).join('');
}

function renderMapTypeButtons() {
  const controls = document.getElementById('mapTypeControls');
  if (!controls) return;
  controls.querySelectorAll('button[data-map-type]').forEach((btn) => {
    const active = btn.dataset.mapType === state.mapTypeId;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

function renderRegionInspector() {
  const inspector = document.getElementById('regionInspector');
  if (!inspector) return;

  const t = TRANSLATIONS[state.language];
  const activeRegion =
    MAP_REGIONS.find((r) => r.wilayah === state.selectedMapRegion) || MAP_REGIONS[0];

  const regionDests = state.destinations.filter((d) => d.wilayah === activeRegion.wilayah);
  const regionFoods = state.foods.filter((f) => f.wilayah === activeRegion.wilayah);
  const regionStays = state.stays.filter((s) => s.wilayah === activeRegion.wilayah);

  const summaryText = state.language === 'en' ? activeRegion.summaryEn : activeRegion.summaryId;
  const highlightsHtml = regionDests.length
    ? regionDests
        .slice(0, 4)
        .map((d) => {
          const hasCoords = Number.isFinite(d.lat) && Number.isFinite(d.lng);
          if (hasCoords) {
            return `
              <li>
                <button type="button" class="inspector-spot-btn" data-action="focus-spot" data-id="${escapeHtml(d.id)}">
                  ${escapeHtml(d.nama)}
                </button>
              </li>
            `;
          }
          return `<li>${escapeHtml(d.nama)}</li>`;
        })
        .join('')
    : `<li>${state.language === 'en' ? 'No sample spots yet' : 'Belum ada destinasi contoh'}</li>`;

  inspector.innerHTML = `
    <div>
      <p class="kicker">${state.language === 'en' ? 'Selected Region' : 'Wilayah Terpilih'}</p>
      <h3>${escapeHtml(activeRegion.wilayah)}</h3>
      <p class="card-desc" style="margin-top:8px;margin-bottom:0">${escapeHtml(summaryText)}</p>
    </div>

    <div class="region-stats">
      <div class="stat-item">
        <span class="stat-value tabular-nums">${regionDests.length}</span>
        <span class="stat-label">${escapeHtml(t.regionDestCount)}</span>
      </div>
      <div class="stat-item">
        <span class="stat-value tabular-nums">${regionFoods.length}</span>
        <span class="stat-label">${escapeHtml(t.regionFoodCount)}</span>
      </div>
      <div class="stat-item">
        <span class="stat-value tabular-nums">${regionStays.length}</span>
        <span class="stat-label">${escapeHtml(t.regionStayCount)}</span>
      </div>
    </div>

    <div>
      <strong style="font-size:13px">${escapeHtml(t.regionHighlights)}:</strong>
      <ul class="highlight-list" style="margin-top:8px">${highlightsHtml}</ul>
    </div>

    <button type="button" class="btn btn-primary" data-action="apply-region-filter" data-region="${escapeHtml(activeRegion.wilayah)}">
      ${escapeHtml(t.filterByRegionBtn)}
    </button>
  `;
}

export function renderMapSection() {
  renderRegionPills();
  renderMapTypeButtons();
  renderRegionInspector();
  void ensureGoogleMapReady();
}

export function initMapModule({ onQuickAddItinerary } = {}) {
  quickAddCallback = onQuickAddItinerary || null;

  const pillsContainer = document.getElementById('mapRegionPills');
  const mapTypeControls = document.getElementById('mapTypeControls');
  const resetViewBtn = document.getElementById('mapResetViewBtn');
  const inspector = document.getElementById('regionInspector');

  const selectRegion = (regionName) => {
    if (!regionName) return;
    state.selectedMapRegion = regionName;
    renderRegionPills();
    renderRegionInspector();
    syncGoogleMapMarkers();
    panMapToRegion(regionName);
  };

  pillsContainer?.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-region]');
    if (btn) {
      selectRegion(btn.dataset.region);
    }
  });

  mapTypeControls?.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-map-type]');
    if (!btn) return;
    const nextType = btn.dataset.mapType;
    if (!nextType) return;
    state.mapTypeId = nextType;
    renderMapTypeButtons();
    if (mapInstance) {
      mapInstance.setMapTypeId(nextType);
    }
  });

  resetViewBtn?.addEventListener('click', () => {
    resetMapToOverview();
  });

  inspector?.addEventListener('click', (event) => {
    const focusBtn = event.target.closest('button[data-action="focus-spot"]');
    if (focusBtn?.dataset.id) {
      focusDestinationOnMap(focusBtn.dataset.id);
      return;
    }

    const filterBtn = event.target.closest('button[data-action="apply-region-filter"]');
    if (!filterBtn) return;
    const regionSelect = document.getElementById('region');
    if (regionSelect) {
      regionSelect.value = filterBtn.dataset.region || '';
      renderDestinations();
      document.getElementById('destinations')?.scrollIntoView({ behavior: 'smooth' });
    }
  });
}
