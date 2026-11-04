import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type Page } from '@/api/client';
import type { DiscrepancyReason, Distribution, DistributionInput, DistributionStatus } from '@/api/types';

const BASE = '/api/v1/distributions';
const keys = {
  all: ['distributions'] as const,
  list: (from: string, to: string, status?: DistributionStatus) => ['distributions', 'list', from, to, status] as const,
  detail: (id: string) => ['distributions', 'detail', id] as const,
};

export function useDistributions(from: string, to: string, status?: DistributionStatus) {
  return useQuery({
    queryKey: keys.list(from, to, status),
    queryFn: () =>
      api<Page<Distribution>>('GET', BASE, { query: { from, to, status, size: 200, sort: 'distributionDate,desc' } }),
  });
}

export function useDistribution(id: string) {
  return useQuery({ queryKey: keys.detail(id), queryFn: () => api<Distribution>('GET', `${BASE}/${id}`) });
}

/** Stock and branch balances change with every step, so refresh them too. */
function useInvalidateAfter() {
  const qc = useQueryClient();
  return (data: Distribution) => {
    qc.setQueryData(keys.detail(data.id), data);
    return Promise.all([
      qc.invalidateQueries({ queryKey: keys.all }),
      qc.invalidateQueries({ queryKey: ['stock-batches'] }),
      qc.invalidateQueries({ queryKey: ['branch-balance'] }),
    ]);
  };
}

export function useCreateDistribution() {
  const after = useInvalidateAfter();
  return useMutation({
    mutationFn: ({ input, key }: { input: DistributionInput; key: string }) =>
      api<Distribution>('POST', BASE, { body: input, idempotencyKey: key }),
    onSuccess: after,
  });
}

export function useDispatch(id: string) {
  const after = useInvalidateAfter();
  return useMutation({
    mutationFn: (key: string) => api<Distribution>('POST', `${BASE}/${id}/dispatch`, { idempotencyKey: key }),
    onSuccess: after,
  });
}

/** Cancels a draft (releases held stock) or reverses a dispatch (stock comes back). */
export function useReverseDistribution(id: string) {
  const after = useInvalidateAfter();
  return useMutation({
    mutationFn: ({ reason, key }: { reason: string; key: string }) =>
      api<Distribution>('POST', `${BASE}/${id}/reverse`, { body: { reason }, idempotencyKey: key }),
    onSuccess: after,
  });
}

export type ReceiptInput = {
  receivedAt: string;
  notes: string | null;
  items: { distributionItemId: string; receivedWeightKg: string; discrepancyReason: DiscrepancyReason | null }[];
};

/** The branch confirms what arrived, line by line; any shortfall needs a reason. */
export function useReceiveDistribution(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, key }: { input: ReceiptInput; key: string }) =>
      api<unknown>('POST', `${BASE}/${id}/receipts`, { body: input, idempotencyKey: key }),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: keys.all }),
        qc.invalidateQueries({ queryKey: ['stock-batches'] }),
        qc.invalidateQueries({ queryKey: ['branch-balance'] }),
      ]),
  });
}
