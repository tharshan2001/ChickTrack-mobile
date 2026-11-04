import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type Page } from '@/api/client';
import type {
  InventoryMovement,
  Procurement,
  ProcurementInput,
  StockAdjustment,
  StockAdjustmentInput,
  StockBatch,
} from '@/api/types';

const keys = {
  batches: ['stock-batches'] as const,
  batch: (id: string) => ['stock-batches', id] as const,
  history: (id: string) => ['stock-history', id] as const,
  procurements: ['procurements'] as const,
};

/**
 * Batches still holding stock, oldest first (the order they are issued in).
 * The newest 200 batches are fetched and empty ones dropped; anything older
 * than that has long been used up.
 */
export function useOpenBatches() {
  return useQuery({
    queryKey: keys.batches,
    queryFn: async () => {
      const page = await api<Page<StockBatch>>('GET', '/api/v1/stock-batches', {
        query: { size: 200, sort: 'receivedAt,desc' },
      });
      return page.content.filter((b) => b.remainingWeightKg.replace(/[0.]/g, '') !== '').reverse();
    },
  });
}

export function useBatch(id: string) {
  return useQuery({ queryKey: keys.batch(id), queryFn: () => api<StockBatch>('GET', `/api/v1/stock-batches/${id}`) });
}

export type HistoryEntry = { id: string; label: string; detail: string | null; change: string; at: string };

const LABELS: Record<InventoryMovement['type'], string> = {
  RECEIPT: 'Received',
  DISTRIBUTION: 'Sent to branch',
  RETURN: 'Returned',
  DAMAGE: 'Damage',
  LOSS: 'Loss',
  ADJUSTMENT: 'Recount',
  REVERSAL: 'Reversal',
};

/**
 * One batch's movements, newest first, with a signed change. Movements carry a
 * positive weight; recounts can go either way, so their sign comes from the
 * matching stock adjustment.
 */
export function useBatchHistory(batchId: string) {
  return useQuery({
    queryKey: keys.history(batchId),
    queryFn: async (): Promise<HistoryEntry[]> => {
      const [movements, adjustments] = await Promise.all([
        api<Page<InventoryMovement>>('GET', '/api/v1/inventory-movements', { query: { batchId, size: 100 } }),
        api<Page<StockAdjustment>>('GET', '/api/v1/stock-adjustments', { query: { batchId, size: 100 } }),
      ]);
      const byId = new Map(adjustments.content.map((a) => [a.id, a]));
      return movements.content.map((m) => {
        const adj = m.referenceType === 'STOCK_ADJUSTMENT' && m.referenceId ? byId.get(m.referenceId) : undefined;
        const out = ['DISTRIBUTION', 'DAMAGE', 'LOSS'].includes(m.type);
        const change = adj ? adj.weightChangeKg : `${out ? '-' : ''}${m.weightKg}`;
        return {
          id: m.id,
          label: LABELS[m.type],
          detail: adj?.reference ?? m.reason ?? null,
          change,
          at: m.createdAt,
        };
      });
    },
  });
}

export function useAdjustStock(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, key }: { input: StockAdjustmentInput; key: string }) =>
      api<StockAdjustment>('POST', '/api/v1/stock-adjustments', { body: input, idempotencyKey: key }),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: keys.batches }),
        qc.invalidateQueries({ queryKey: keys.history(batchId) }),
      ]),
  });
}

export function useCreateProcurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, key }: { input: ProcurementInput; key: string }) =>
      api<Procurement>('POST', '/api/v1/procurements', { body: input, idempotencyKey: key }),
    // Saving a purchase receives its stock straight away.
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: keys.batches }),
        qc.invalidateQueries({ queryKey: keys.procurements }),
      ]),
  });
}

export function useProcurements(from: string, to: string) {
  return useQuery({
    queryKey: [...keys.procurements, from, to],
    queryFn: () =>
      api<Page<Procurement>>('GET', '/api/v1/procurements', {
        query: { from, to, size: 200, sort: 'procurementDate,desc' },
      }),
  });
}

export function useProcurement(id: string) {
  return useQuery({
    queryKey: [...keys.procurements, 'detail', id],
    queryFn: () => api<Procurement>('GET', `/api/v1/procurements/${id}`),
  });
}
