import type { BranchSale, OpenSale } from '@/api/types';
import { Badge } from '@/components/ui';
import { toUnits } from '@/lib/decimal';

export type PaymentState = 'paid' | 'part' | 'unpaid';

export function paymentState(sale: Pick<BranchSale, 'id' | 'transferValue'>, open: OpenSale[] | undefined) {
  const row = open?.find((o) => o.branchSaleId === sale.id);
  const owed = row ? row.outstandingAmount : '0.00';
  const state: PaymentState =
    toUnits(owed, 2) <= 0n ? 'paid' : toUnits(owed, 2) >= toUnits(sale.transferValue, 2) ? 'unpaid' : 'part';
  return { state, owed };
}

export function PaymentBadge({ state }: { state: PaymentState }) {
  if (state === 'paid') return <Badge label="Paid" tone="success" />;
  if (state === 'part') return <Badge label="Part paid" tone="warning" />;
  return <Badge label="Unpaid" tone="danger" />;
}
