const idrFormatter = new Intl.NumberFormat('id-ID');

export function formatMoney(amount, lang = 'id') {
  const num = Number(amount);
  if (!Number.isFinite(num) || num <= 0) {
    return lang === 'en' ? 'Free' : 'Gratis';
  }
  return `Rp ${idrFormatter.format(Math.round(num))}`;
}

export function formatRupiah(amount) {
  const num = Number(amount);
  const safe = Number.isFinite(num) && num >= 0 ? Math.round(num) : 0;
  return `Rp ${idrFormatter.format(safe)}`;
}

const CATEGORY_LABELS = {
  id: {
    religi: 'Religi',
    sejarah: 'Sejarah',
    bahari: 'Bahari',
    alam: 'Alam',
    budaya: 'Budaya',
  },
  en: {
    religi: 'Religious',
    sejarah: 'Heritage',
    bahari: 'Marine',
    alam: 'Nature',
    budaya: 'Culture',
  },
};

export function formatCategory(category, lang = 'id') {
  const key = String(category ?? '').trim().toLowerCase();
  return CATEGORY_LABELS[lang]?.[key] || category || '-';
}
