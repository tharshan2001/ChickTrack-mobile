import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type Page } from '@/api/client';
import type { ChickenType, ChickenTypeInput } from '@/api/types';

const BASE = '/api/v1/chicken-types';

export const productKeys = {
  all: ['chicken-types'] as const,
  list: (search: string, active?: boolean) => [...productKeys.all, 'list', { search, active }] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
};

export function useProducts(search: string, active?: boolean) {
  return useQuery({
    queryKey: productKeys.list(search, active),
    queryFn: () =>
      api<Page<ChickenType>>('GET', BASE, { query: { search: search.trim(), active, size: 100, sort: 'name' } }),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => api<ChickenType>('GET', `${BASE}/${id}`),
  });
}

/** Each mutation takes the idempotency key generated when the form opened. */
export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, key }: { input: ChickenTypeInput; key: string }) =>
      api<ChickenType>('POST', BASE, { body: input, idempotencyKey: key }),
    onSuccess: () => qc.invalidateQueries({ queryKey: productKeys.all }),
  });
}

export function useUpdateProduct(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, key }: { input: ChickenTypeInput; key: string }) =>
      api<ChickenType>('PUT', `${BASE}/${id}`, { body: input, idempotencyKey: key }),
    onSuccess: (data) => {
      qc.setQueryData(productKeys.detail(id), data);
      return qc.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useSetProductActive(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (active: boolean) => api<ChickenType>('PATCH', `${BASE}/${id}/status`, { body: { active } }),
    onSuccess: (data) => {
      qc.setQueryData(productKeys.detail(id), data);
      return qc.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}
