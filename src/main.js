import {
  initAdminModule,
  renderAdminAccessState,
  renderAdminList,
  updateAdminFormLabels,
} from './components/admin.js';
import { initAuthModule, updateAuthUI } from './components/auth.js';
import { initCulinaryAndStayModule, renderFoods, renderStays } from './components/culinaryAndStay.js';
import {
  initDestinationsModule,
  populateDestinationFilters,
  renderDestinations,
} from './components/destinations.js';
import { initMapModule, renderMapSection } from './components/mapSection.js';
import { initModalListeners } from './components/modal.js';
import {
  addDestinationToDay,
  initPlannerModule,
  renderBudgetCalculation,
  renderDayBuilder,
  renderRecommendations,
} from './components/planner.js';
import { TRANSLATIONS } from './i18n/translations.js';
import { persistKey, state } from './state/store.js';
import { STORAGE_KEYS } from './utils/storage.js';

// Tier 1 global Google Maps quota and auth failure monitoring
if (typeof window !== 'undefined') {
  window.gm_authFailure = () => {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  };

  const originalConsoleError = console.error;
  console.error = (...args) => {
    originalConsoleError.apply(console, args);
    const msg = args.map((item) => String(item)).join(' ');
    if (msg.includes('OverQuotaMapError') || msg.includes('QuotaExceededError')) {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    }
  };
}

let quotaExceededActive = false;

function initQuotaBanner() {
  const banner = document.getElementById('gmpQuotaBanner');
  const closeBtn = document.getElementById('gmpQuotaCloseBtn');
  if (!banner) return;

  window.addEventListener('gmp-quota-exceeded', () => {
    quotaExceededActive = true;
    banner.hidden = false;
  });

  closeBtn?.addEventListener('click', () => {
    banner.hidden = true;
  });

  if (quotaExceededActive) {
    banner.hidden = false;
  }
}

function applyLanguage(lang) {
  state.language = lang === 'en' ? 'en' : 'id';
  document.documentElement.lang = state.language;
  persistKey(STORAGE_KEYS.language, state.language);

  const t = TRANSLATIONS[state.language];
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (typeof t[key] === 'string') {
      el.textContent = t[key];
    }
  });

  const searchInput = document.getElementById('search');
  if (searchInput) searchInput.placeholder = t.searchPlaceholder;

  const sortSelect = document.getElementById('sort');
  if (sortSelect && sortSelect.options.length >= 3) {
    sortSelect.options[0].textContent = t.sortName;
    sortSelect.options[1].textContent = t.sortCostAsc;
    sortSelect.options[2].textContent = t.sortCostDesc;
  }

  const interestSelect = document.getElementById('interest');
  if (interestSelect && interestSelect.options.length >= 6) {
    const isEn = state.language === 'en';
    interestSelect.options[0].textContent = t.allInterests;
    interestSelect.options[1].textContent = isEn ? 'Nature' : 'Alam';
    interestSelect.options[2].textContent = isEn ? 'Marine' : 'Bahari';
    interestSelect.options[3].textContent = isEn ? 'Religious' : 'Religi';
    interestSelect.options[4].textContent = isEn ? 'Heritage' : 'Sejarah';
    interestSelect.options[5].textContent = isEn ? 'Culture' : 'Budaya';
  }

  renderAll();
}

function renderAll() {
  populateDestinationFilters();
  renderDestinations();
  renderMapSection();
  renderFoods();
  renderStays();
  renderDayBuilder();
  renderBudgetCalculation();
  renderRecommendations();
  renderAdminAccessState();
  updateAdminFormLabels();
  renderAdminList();
  updateAuthUI();
}

function initMobileNavigation() {
  const menuBtn = document.getElementById('mobileMenuBtn');
  const drawer = document.getElementById('mobileDrawer');
  if (!menuBtn || !drawer) return;

  menuBtn.addEventListener('click', () => {
    const isExpanded = menuBtn.getAttribute('aria-expanded') === 'true';
    menuBtn.setAttribute('aria-expanded', String(!isExpanded));
    drawer.hidden = isExpanded;
  });

  drawer.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      menuBtn.setAttribute('aria-expanded', 'false');
      drawer.hidden = true;
    }
  });
}

function bootstrap() {
  initQuotaBanner();
  initModalListeners();
  initMobileNavigation();

  const onQuickAddItinerary = (destId) => addDestinationToDay(destId, 0);

  initDestinationsModule({
    onQuickAddItinerary,
  });
  initMapModule({
    onQuickAddItinerary,
  });
  initCulinaryAndStayModule();
  initPlannerModule();
  initAdminModule({
    onDataChanged: renderAll,
  });
  initAuthModule({
    onAuthChanged: renderAll,
  });

  const langSelect = document.getElementById('language');
  if (langSelect) {
    langSelect.value = state.language;
    langSelect.addEventListener('change', () => {
      applyLanguage(langSelect.value);
    });
  }

  applyLanguage(state.language);
}

bootstrap();
