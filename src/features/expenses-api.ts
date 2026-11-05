import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type Page } from '@/api/client';
import type { OperatingExpense, OperatingExpenseInput } from '@/api/types';

const base = '/api/v1/expenses';

export type ExpenseScope = 'all' | 'office' | 'branches';

export const expenseKeys = {
  all: ['expenses'] as const,
  list: (from: string, to: string, scope: ExpenseScope) => ['expenses', 'list', from, to, scope] as const,
  detail: (id: string) => ['expenses', 'detail', id] as const,
};

export function useExpenses(from: string, to: string, scope: ExpenseScope = 'all') {
  return useQuery({
    queryKey: expenseKeys.list(from, to, scope),
    queryFn: async () => {
      const page = await api<Page<OperatingExpense>>('GET', base, {
        query: { from, to, headOffice: scope === 'office' ? true : undefined, size: 200, sort: 'expenseDate,desc' },
      });
      return scope === 'branches' ? page.content.filter((e) => e.branchId) : page.content;
    },
  });
}

export function useExpense(id: string) {
  return useQuery({ queryKey: expenseKeys.detail(id), queryFn: () => api<OperatingExpense>('GET', `${base}/${id}`) });
}

function useSaved() {
  const qc = useQueryClient();
  return (expense: OperatingExpense) => {
    qc.setQueryData(expenseKeys.detail(expense.id), expense);
    return Promise.all([
      qc.invalidateQueries({ queryKey: expenseKeys.all }),
      qc.invalidateQueries({ queryKey: ['profit-loss'] }),
    ]);
  };
}

export function useCreateExpense() {
  const saved = useSaved();
  return useMutation({
    mutationFn: ({ input, key }: { input: OperatingExpenseInput; key: string }) =>
      api<OperatingExpense>('POST', base, { body: input, idempotencyKey: key }),
    onSuccess: saved,
  });
}

export function useUpdateExpense(id: string) {
  const saved = useSaved();
  return useMutation({
    mutationFn: ({ input, key }: { input: OperatingExpenseInput; key: string }) =>
      api<OperatingExpense>('PUT', `${base}/${id}`, { body: input, idempotencyKey: key }),
    onSuccess: saved,
  });
}

export function useVoidExpense(id: string) {
  const saved = useSaved();
  return useMutation({
    mutationFn: ({ reason, key }: { reason: string; key: string }) =>
      api<OperatingExpense>('POST', `${base}/${id}/void`, { body: { reason }, idempotencyKey: key }),
    onSuccess: saved,
  });
}
