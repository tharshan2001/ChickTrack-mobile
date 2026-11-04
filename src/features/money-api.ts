import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type Page } from '@/api/client';
import type { OpenSale, Settlement, SettlementInput } from '@/api/types';

export const METHOD_LABEL: Record<string, string> = { CASH: 'cash', BANK: 'bank', CHEQUE: 'cheque' };

const keys = {
  settlements: ['settlements'] as const,
  openSales: (branchId: string) => ['open-sales', branchId] as const,
};

export function useSettlements(branchId?: string) {
  return useQuery({
    queryKey: [...keys.settlements, branchId],
    queryFn: () =>
      api<Page<Settlement>>('GET', '/api/v1/branch-settlements', {
        query: { branchId, size: 50, sort: 'settlementDate,desc' },
      }).then((p) => p.content),
  });
}

export function useSettlement(id: string) {
  return useQuery({
    queryKey: [...keys.settlements, 'detail', id],
    queryFn: () => api<Settlement>('GET', `/api/v1/branch-settlements/${id}`),
  });
}

/** Unpaid sales of a branch, oldest first. */
export function useOpenSales(branchId: string | null) {
  return useQuery({
    queryKey: keys.openSales(branchId ?? ''),
    queryFn: () => api<OpenSale[]>('GET', `/api/v1/branches/${branchId}/open-sales`),
    enabled: !!branchId,
  });
}

function useAfterPayment() {
  const qc = useQueryClient();
  return (branchId: string) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.settlements }),
      qc.invalidateQueries({ queryKey: keys.openSales(branchId) }),
      qc.invalidateQueries({ queryKey: ['branch-balance'] }),
    ]);
}

export function useRecordPayment() {
  const after = useAfterPayment();
  return useMutation({
    mutationFn: ({ input, key }: { input: SettlementInput; key: string }) =>
      api<Settlement>('POST', '/api/v1/branch-settlements', { body: input, idempotencyKey: key }),
    onSuccess: (s) => after(s.branchId),
  });
}

/** Undo a payment that bounced or was entered by mistake; the branch owes the amount again. */
export function useReversePayment(id: string) {
  const after = useAfterPayment();
  return useMutation({
    mutationFn: ({ reason, key }: { reason: string; key: string }) =>
      api<Settlement>('POST', `/api/v1/branch-settlements/${id}/reverse`, { body: { reason }, idempotencyKey: key }),
    onSuccess: (s) => after(s.branchId),
  });
}
