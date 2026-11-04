/** Business dates are Sri Lanka time (Asia/Colombo), matching the backend. */
export const BUSINESS_TZ = 'Asia/Colombo';

export const BusinessDate = {
  today(): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: BUSINESS_TZ,
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    }).format(new Date());
  },
};

/**
 * Formats a decimal string from the API ("532000.00") as "Rs 532,000.00"
 * without going through floating point.
 */
export function formatRupees(amount: string, fractionDigits = 2): string {
  const negative = amount.startsWith('-');
  const [whole, frac = ''] = amount.replace('-', '').split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const cents = fractionDigits > 0 ? `.${frac.padEnd(fractionDigits, '0').slice(0, fractionDigits)}` : '';
  return `${negative ? '-' : ''}Rs ${grouped}${cents}`;
}

/** "2026-11-05" -> the instant that day starts in Colombo, as ISO-8601 UTC. */
export function colomboDayStart(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00+05:30`).toISOString();
}

/** Calendar date (yyyy-mm-dd) of a local Date as the user picked it. */
export function toIsoDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** "2026-11-05" -> "5 Nov 2026". */
export function formatIsoDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(y!, m! - 1, d!),
  );
}
