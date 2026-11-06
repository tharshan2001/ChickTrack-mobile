import type { BranchSale } from '@/api/types';
import { Badge } from '@/components/ui';
import { formatRupees } from '@/lib/format';
import { toUnits } from '@/lib/decimal';

export type VarianceState = 'short' | 'over' | 'even' | 'unknown';

/** Takings against the branch price: short when the branch took less than expected. */
export function varianceState(sale: Pick<BranchSale, 'variance'>): VarianceState {
  if (sale.variance == null) return 'unknown';
  const v = toUnits(sale.variance, 2);
  return v < 0n ? 'short' : v > 0n ? 'over' : 'even';
}

/** "Short Rs 2,500" / "Over Rs 300" / "On target"; nothing when expected sales are unknown. */
export function VarianceBadge({ sale }: { sale: Pick<BranchSale, 'variance'> }) {
  const state = varianceState(sale);
  if (state === 'unknown') return null;
  if (state === 'even') return <Badge label="On target" tone="success" />;
  const amount = formatRupees(sale.variance!.replace('-', ''), 0);
  return state === 'short' ? <Badge label={`Short ${amount}`} tone="danger" /> : <Badge label={`Over ${amount}`} tone="success" />;
}
