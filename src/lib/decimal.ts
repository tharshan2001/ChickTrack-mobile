/**
 * Decimal helpers that work on strings and BigInt, so money and weights are
 * never rounded by floating point. The backend accepts and returns plain
 * decimal strings ("905.50", "120.000").
 */

/** Accepts what a user may type while entering a decimal ("", "12", "12.", "12.5"). */
export function isDecimalDraft(text: string, scale = 2): boolean {
  return new RegExp(`^\\d{0,9}(\\.\\d{0,${scale}})?$`).test(text);
}

/** A complete non-negative decimal ("12", "12.50"). */
export function isDecimal(text: string, scale = 2): boolean {
  return new RegExp(`^\\d{1,9}(\\.\\d{1,${scale}})?$`).test(text.trim());
}

/** A complete decimal greater than zero. */
export function isPositiveDecimal(text: string, scale = 2): boolean {
  return isDecimal(text, scale) && toUnits(text, scale) > 0n;
}

/** Normalises "12" / "12.5" to "12.00" / "12.50" for display or sending. */
export function toFixedString(text: string, scale = 2): string {
  return fromUnits(toUnits(text, scale), scale);
}

/** Percent string from the API ("10.0000") shown as "10%", "2.5%". */
export function formatPercent(value: string): string {
  const [whole, frac = ''] = value.split('.');
  const trimmed = frac.replace(/0+$/, '');
  return `${whole}${trimmed ? `.${trimmed}` : ''}%`;
}

// ---- exact arithmetic ----

/** "12.345" at scale 2 -> 1235n (half-up). Empty or invalid text -> 0n. */
export function toUnits(text: string | null | undefined, scale: number): bigint {
  const t = (text ?? '').trim();
  if (!/^-?\d*(\.\d*)?$/.test(t) || t === '' || t === '-' || t === '.') return 0n;
  const negative = t.startsWith('-');
  const [w = '', f = ''] = t.replace('-', '').split('.');
  const kept = BigInt((w || '0') + f.padEnd(scale, '0').slice(0, scale));
  const roundUp = f.length > scale && Number(f[scale]) >= 5 ? 1n : 0n;
  const units = kept + roundUp;
  return negative ? -units : units;
}

/** 1235n at scale 2 -> "12.35". */
export function fromUnits(units: bigint, scale: number): string {
  const negative = units < 0n;
  const s = (negative ? -units : units).toString().padStart(scale + 1, '0');
  const whole = s.slice(0, s.length - scale);
  const frac = s.slice(s.length - scale);
  return `${negative ? '-' : ''}${whole}${scale ? `.${frac}` : ''}`;
}

/** a / b, both as units, rounded half-up. */
export function divRound(a: bigint, b: bigint): bigint {
  if (b === 0n) return 0n;
  const negative = a < 0n !== b < 0n;
  const [x, y] = [a < 0n ? -a : a, b < 0n ? -b : b];
  const q = (x * 2n + y) / (2n * y);
  return negative ? -q : q;
}

export const pow10 = (n: number) => 10n ** BigInt(n);

/** Sum of decimal strings at a given scale, returned as a string at that scale. */
export function sum(values: (string | null | undefined)[], scale: number): string {
  return fromUnits(
    values.reduce((acc, v) => acc + toUnits(v, scale), 0n),
    scale,
  );
}

/** "515.000" -> "515", "12.500" -> "12.5" (for compact weights). */
export function trimZeros(value: string): string {
  return value.includes('.') ? value.replace(/\.?0+$/, '') : value;
}

/** Weight for display: "1,234.5 kg". */
export function formatKg(value: string): string {
  const t = trimZeros(value);
  const [w, f] = t.replace('-', '').split('.');
  const grouped = w!.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${t.startsWith('-') ? '-' : ''}${grouped}${f ? `.${f}` : ''} kg`;
}
