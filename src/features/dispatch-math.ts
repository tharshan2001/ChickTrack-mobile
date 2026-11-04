import type { StockBatch } from '@/api/types';
import { divRound, toUnits } from '@/lib/decimal';

/**
 * Preview of a dispatch, mirroring DistributionService: weight is taken from
 * free stock oldest batch first; each batch line costs its landed cost plus
 * our margin; delivery costs are shared across lines by weight. Units: weight
 * 3 dp, money 2 dp, per-kg prices 4 dp. The saved dispatch has the real figures.
 */
export type LinePreview = {
  /** Free kg across this product's batches. */
  freeKg: bigint;
  enough: boolean;
  batchCount: number;
  oldestBatch: StockBatch | null;
  /** Sum of weight × landed cost (2 dp). */
  cost: bigint;
  /** Sum of weight × margin (2 dp). */
  margin: bigint;
  /** Average landed cost per kg (2 dp), for display. */
  landedPerKg: bigint;
  marginPerKg: bigint;
};

const W = 1000n; // 3 dp weight
const P4 = 10000n; // 4 dp per-kg price

export function previewLine(batches: StockBatch[], weight: string, markupPercent: string): LinePreview {
  let left = toUnits(weight, 3);
  const pct = toUnits(markupPercent, 4); // percent at 4 dp
  const freeKg = batches.reduce((a, b) => a + toUnits(b.availableWeightKg, 3), 0n);
  let cost = 0n;
  let margin = 0n;
  let batchCount = 0;
  let oldestBatch: StockBatch | null = null;
  for (const b of batches) {
    if (left <= 0n) break;
    const free = toUnits(b.availableWeightKg, 3);
    if (free <= 0n) continue;
    const take = free < left ? free : left;
    const landed4 = toUnits(b.landedCostPerKg, 4);
    const marginPerKg4 = divRound(landed4 * pct, 100n * P4);
    // weight(3dp) × price(4dp) = 7dp -> 2dp
    cost += divRound(take * landed4, W * 100n);
    margin += divRound(take * marginPerKg4, W * 100n);
    oldestBatch ??= b;
    batchCount += 1;
    left -= take;
  }
  const kg = toUnits(weight, 3);
  return {
    freeKg,
    enough: left <= 0n,
    batchCount,
    oldestBatch,
    cost,
    margin,
    landedPerKg: kg > 0n ? divRound(cost * W, kg) : 0n,
    marginPerKg: kg > 0n ? divRound(margin * W, kg) : 0n,
  };
}

/** Delivery cost per kg (2 dp) when `expenses` (2 dp units) are shared over `totalKg` (3 dp units). */
export function expensePerKg(expenses: bigint, totalKg: bigint): bigint {
  return totalKg > 0n ? divRound(expenses * W, totalKg) : 0n;
}
