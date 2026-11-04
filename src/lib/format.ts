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
