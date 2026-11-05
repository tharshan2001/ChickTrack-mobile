/** Business dates are Sri Lanka time (Asia/Colombo), matching the backend. */
export const BUSINESS_TZ = 'Asia/Colombo';

export const BusinessDate = {
  today(): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: BUSINESS_TZ,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
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

/** Today's calendar date in Colombo (yyyy-mm-dd), whatever the phone's time zone. */
export function colomboToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TZ }).format(new Date());
}

/** Shifts a yyyy-mm-dd date by whole days. */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const t = new Date(Date.UTC(y!, m! - 1, d! + days));
  return t.toISOString().slice(0, 10);
}

/** Monday of the week containing the date. */
export function weekStart(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dow = new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay(); // 0 = Sunday
  return addDays(isoDate, -((dow + 6) % 7));
}

/** "2026-11-04" -> "Wednesday 4 Nov". */
export function formatDayHeading(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y!, m! - 1, d!)),
  );
}

/** "RECEIVED" / "PARTIALLY_RECEIVED" -> "Received" / "Partially received". */
export function statusLabel(status: string): string {
  const s = status.toLowerCase().replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Short rupee amount for tight tiles, in the lakh/crore style used in Sri Lanka:
 * 1,071,894.20 -> "Rs 10.7 lakh", 25,500,000 -> "Rs 2.55 crore", 84,300 -> "Rs 84,300".
 */
export function formatRupeesCompact(amount: string): string {
  const negative = amount.trim().startsWith('-');
  const rupees = BigInt(amount.replace('-', '').split('.')[0] || '0');
  const sign = negative ? '-' : '';
  const scaled = (n: bigint, unit: bigint, digits: number) => {
    const factor = 10n ** BigInt(digits);
    const v = (n * factor + unit / 2n) / unit;
    const whole = v / factor;
    const frac = (v % factor).toString().padStart(digits, '0').replace(/0+$/, '');
    return `${whole}${frac ? `.${frac}` : ''}`;
  };
  if (rupees >= 10_000_000n) return `${sign}Rs ${scaled(rupees, 10_000_000n, 2)} crore`;
  if (rupees >= 100_000n) return `${sign}Rs ${scaled(rupees, 100_000n, 1)} lakh`;
  return formatRupees(amount, 0);
}
