import {
  SEED_DESTINATIONS,
  SEED_FOODS,
  SEED_PACKAGES,
  SEED_STAYS,
} from '../data/seed.js';
import {
  STORAGE_KEYS,
  clearAppStorage,
  loadFromStorage,
  saveToStorage,
} from '../utils/storage.js';

export const SEED_DEMO_USERS = [
  {
    id: 'u_traveler',
    name: 'Rani Putri',
    email: 'wisatawan@acehhypetrip.demo',
    password: 'aceh2026',
    role: 'traveler',
  },
  {
    id: 'u_admin',
    name: 'Teuku Arif',
    email: 'admin@acehhypetrip.demo',
    password: 'admin2026',
    role: 'admin',
  },
];

function hydrateDestinations(rawList) {
  const seedById = new Map(SEED_DESTINATIONS.map((item) => [item.id, item]));
  return rawList.map((dest) => {
    if (typeof dest.lat === 'number' && typeof dest.lng === 'number') {
      return dest;
    }
    const seedMatch = seedById.get(dest.id);
    if (seedMatch && typeof seedMatch.lat === 'number' && typeof seedMatch.lng === 'number') {
      return { ...dest, lat: seedMatch.lat, lng: seedMatch.lng };
    }
    return dest;
  });
}

export const state = {
  destinations: hydrateDestinations(loadFromStorage(STORAGE_KEYS.destinations, SEED_DESTINATIONS)),
  foods: loadFromStorage(STORAGE_KEYS.foods, SEED_FOODS),
  stays: loadFromStorage(STORAGE_KEYS.stays, SEED_STAYS),
  packages: loadFromStorage(STORAGE_KEYS.packages, SEED_PACKAGES),
  favorites: loadFromStorage(STORAGE_KEYS.favorites, []),
  language: loadFromStorage(STORAGE_KEYS.language, 'id'),
  users: loadFromStorage(STORAGE_KEYS.users, SEED_DEMO_USERS),
  currentUser: loadFromStorage(STORAGE_KEYS.session, null),
  selectedMapRegion: 'Banda Aceh',
  mapTypeId: 'hybrid',
  onlyFavorites: false,
  adminType: 'destinations',
  itineraryDays: [[], [], []],
};

export function persistKey(key, value) {
  saveToStorage(key, value);
}

export function isFavorite(id) {
  return state.favorites.includes(id);
}

export function toggleFavorite(id) {
  if (isFavorite(id)) {
    state.favorites = state.favorites.filter((item) => item !== id);
  } else {
    state.favorites = [...state.favorites, id];
  }
  saveToStorage(STORAGE_KEYS.favorites, state.favorites);
  return isFavorite(id);
}

export function setCurrentUser(user) {
  if (!user) {
    state.currentUser = null;
    saveToStorage(STORAGE_KEYS.session, null);
    return;
  }
  const safeSession = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
  state.currentUser = safeSession;
  saveToStorage(STORAGE_KEYS.session, safeSession);
}

export function resetAllData() {
  const activeSession = state.currentUser;
  clearAppStorage();
  state.destinations = loadFromStorage(STORAGE_KEYS.destinations, SEED_DESTINATIONS);
  state.foods = loadFromStorage(STORAGE_KEYS.foods, SEED_FOODS);
  state.stays = loadFromStorage(STORAGE_KEYS.stays, SEED_STAYS);
  state.packages = loadFromStorage(STORAGE_KEYS.packages, SEED_PACKAGES);
  state.users = loadFromStorage(STORAGE_KEYS.users, SEED_DEMO_USERS);
  state.currentUser = activeSession;
  if (activeSession) {
    saveToStorage(STORAGE_KEYS.session, activeSession);
  }
  state.favorites = [];
  state.onlyFavorites = false;
  state.selectedMapRegion = 'Banda Aceh';
  state.itineraryDays = [[], [], []];
}
