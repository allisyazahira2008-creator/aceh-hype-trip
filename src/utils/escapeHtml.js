const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}

export function sanitizeImageUrl(url, fallback = '') {
  const trimmed = String(url ?? '').trim();
  if (!trimmed) {
    return fallback;
  }
  if (trimmed.startsWith('/src/') || trimmed.startsWith('/assets/')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

export function buildGoogleMapsUrl(destination) {
  const query = [destination.alamat || destination.wilayah, 'Aceh', 'Indonesia']
    .filter(Boolean)
    .join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
