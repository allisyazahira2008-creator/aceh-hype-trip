export const STORAGE_KEYS = {
  destinations: 'aht_v3_destinations',
  foods: 'aht_v3_foods',
  stays: 'aht_v3_stays',
  packages: 'aht_v3_packages',
  favorites: 'aht_v2_favorites',
  itinerary: 'aht_v2_itinerary',
  language: 'aht_v2_language',
  users: 'aht_v3_users',
  session: 'aht_v3_session',
};

function cloneData(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

export function loadFromStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return cloneData(fallback);
    }
    return JSON.parse(raw);
  } catch {
    return cloneData(fallback);
  }
}

export function saveToStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function clearAppStorage() {
  Object.values(STORAGE_KEYS).forEach((key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage removal errors in restricted frames
    }
  });
}
