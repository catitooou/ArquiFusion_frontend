export function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Math.max(0, Date.now() - Date.parse(iso));
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'hace segundos';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h ${m % 60} min`;
  return `hace ${Math.floor(h / 24)} d`;
}

const dtf = new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' });
const tf = new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' });

export const formatDateTime = (iso) => (iso ? dtf.format(new Date(iso)) : '—');
export const formatTime = (iso) => (iso ? tf.format(new Date(iso)) : '—');

const nf = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 });
export const formatNumber = (n) => (n == null ? '—' : nf.format(n));

export const pct = (x) => `${Math.round((x || 0) * 100)}%`;

export const cx = (...c) => c.filter(Boolean).join(' ');
