import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type Page } from '@/api/client';
import type { BranchSale, BranchSaleInput, BranchStock } from '@/api/types';

export const branchKeys = {
  stock: (id: string) => ['branch-stock', id] as const,
  balance: (id: string) => ['branch-balance', id] as const,
  sales: (id: string, from: string, to: string) => ['branch-sales', id, from, to] as const,
};

/** Weight the branch holds per product (received minus sold). */
export function useBranchStock(branchId: string) {
  return useQuery({
    queryKey: branchKeys.stock(branchId),
    queryFn: () => api<BranchStock[]>('GET', `/api/v1/branches/${branchId}/stock`),
  });
}

/** What the branch owes head office for stock sold and not yet paid for. */
export function useBranchBalance(branchId: string) {
  return useQuery({
    queryKey: branchKeys.balance(branchId),
    queryFn: () =>
      api<{ outstandingAmount: string }>('GET', `/api/v1/branches/${branchId}/balance`).then((b) => b.outstandingAmount),
  });
}

export function useBranchSales(branchId: string, from: string, to: string) {
  return useQuery({
    queryKey: branchKeys.sales(branchId, from, to),
    queryFn: () =>
      api<Page<BranchSale>>('GET', '/api/v1/branch-sales', {
        query: { branchId, from, to, size: 200, sort: 'saleDate,desc' },
      }).then((p) => p.content),
  });
}

export function useRecordSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, key }: { input: BranchSaleInput; key: string }) =>
      api<BranchSale>('POST', '/api/v1/branch-sales', { body: input, idempotencyKey: key }),
    onSuccess: (_d, { input }) =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ['branch-sales', input.branchId] }),
        qc.invalidateQueries({ queryKey: branchKeys.stock(input.branchId) }),
        qc.invalidateQueries({ queryKey: branchKeys.balance(input.branchId) }),
      ]),
  });
}
