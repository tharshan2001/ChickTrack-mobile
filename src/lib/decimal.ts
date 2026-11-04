/**
 * Decimal helpers that work on strings, so amounts are never rounded by
 * floating point. The backend accepts and returns plain decimal strings.
 */

/** Accepts what a user may type while entering a decimal ("", "12", "12.", "12.5"). */
export function isDecimalDraft(text: string, scale = 2): boolean {
  return new RegExp(`^\\d{0,9}(\\.\\d{0,${scale}})?$`).test(text);
}

/** A complete non-negative decimal ("12", "12.50"). */
export function isDecimal(text: string, scale = 2): boolean {
  return new RegExp(`^\\d{1,9}(\\.\\d{1,${scale}})?$`).test(text.trim());
}

/** Normalises "12" / "12.5" to "12.00" / "12.50" for display or sending. */
export function toFixedString(text: string, scale = 2): string {
  const [whole, frac = ''] = text.trim().split('.');
  return `${String(Number(whole))}.${frac.padEnd(scale, '0').slice(0, scale)}`;
}

/** Percent string from the API ("10.0000") shown as "10%", "2.5%". */
export function formatPercent(value: string): string {
  const [whole, frac = ''] = value.split('.');
  const trimmed = frac.replace(/0+$/, '');
  return `${whole}${trimmed ? `.${trimmed}` : ''}%`;
}
