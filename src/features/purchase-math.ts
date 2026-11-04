import type { CommissionMethod } from '@/api/types';
import { divRound, fromUnits, toUnits } from '@/lib/decimal';

/**
 * Preview of what the backend will calculate for a purchase, in exact
 * integer units (weights at 3 decimals, money at 2). The server's numbers
 * are the record; this only shows the owner what to expect before saving.
 */
export type ItemDraft = {
  kg: string;
  price: string;
  birds: string;
  method: CommissionMethod;
  commission: string;
};

export type ItemPreview = {
  kgUnits: bigint;
  purchase: bigint;
  commission: bigint;
  expenseShare: bigint;
  total: bigint;
  /** Money units (2 dp) per kg, or null when weight is zero. */
  landedPerKg: bigint | null;
};

export function commissionUnits(d: ItemDraft, purchase: bigint): bigint {
  const c = toUnits(d.commission, 2);
  switch (d.method) {
    case 'FIXED':
      return c;
    case 'PER_KG':
      return divRound(toUnits(d.kg, 3) * c, 1000n);
    case 'PERCENTAGE':
      return divRound(purchase * c, 10000n);
    case 'PER_BIRD':
      return BigInt(Number.parseInt(d.birds || '0', 10) || 0) * c;
  }
}

/** Costs (transport, labour…) are shared across items by paid weight, as the backend does. */
export function previewPurchase(items: ItemDraft[], expenseAmounts: string[]) {
  const expenses = expenseAmounts.reduce((a, v) => a + toUnits(v, 2), 0n);
  const totalKg = items.reduce((a, d) => a + toUnits(d.kg, 3), 0n);

  const previews: ItemPreview[] = items.map((d) => {
    const kgUnits = toUnits(d.kg, 3);
    const purchase = divRound(kgUnits * toUnits(d.price, 2), 1000n);
    const commission = commissionUnits(d, purchase);
    const expenseShare = totalKg > 0n ? divRound(expenses * kgUnits, totalKg) : 0n;
    const total = purchase + commission + expenseShare;
    return {
      kgUnits,
      purchase,
      commission,
      expenseShare,
      total,
      landedPerKg: kgUnits > 0n ? divRound(total * 1000n, kgUnits) : null,
    };
  });

  return {
    items: previews,
    totalKg: fromUnits(totalKg, 3),
    expenses: fromUnits(expenses, 2),
    total: fromUnits(
      previews.reduce((a, p) => a + p.total, 0n),
      2,
    ),
  };
}

export const COMMISSION_OPTIONS: { value: CommissionMethod; label: string; unit: string }[] = [
  { value: 'FIXED', label: 'Fixed', unit: 'Rs' },
  { value: 'PER_KG', label: 'Per kg', unit: 'Rs / kg' },
  { value: 'PERCENTAGE', label: '%', unit: '%' },
  { value: 'PER_BIRD', label: 'Bird', unit: 'Rs / bird' },
];
