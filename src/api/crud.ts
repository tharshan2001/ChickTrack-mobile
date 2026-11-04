import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type Page } from '@/api/client';

/**
 * React Query hooks for the backend's standard master-data resources
 * (chicken types, suppliers, branches, expense categories):
 *   GET    {base}?search=&active=&size=&sort=   -> Page<T>
 *   GET    {base}/{id}                          -> T
 *   POST   {base}                               -> T
 *   PUT    {base}/{id}                          -> T
 *   PATCH  {base}/{id}/status { active }        -> T
 */
export function createCrud<T extends { id: string }, Create, Update = Create>(base: string) {
  const keys = {
    all: [base] as const,
    list: (search: string, active?: boolean) => [base, 'list', { search, active }] as const,
    detail: (id: string) => [base, 'detail', id] as const,
  };

  function useList(search = '', active?: boolean) {
    return useQuery({
      queryKey: keys.list(search, active),
      // Master lists are short; one page of 200 sorted by name covers them.
      queryFn: () => api<Page<T>>('GET', base, { query: { search: search.trim(), active, size: 200, sort: 'name' } }),
    });
  }

  function useOne(id: string) {
    return useQuery({ queryKey: keys.detail(id), queryFn: () => api<T>('GET', `${base}/${id}`) });
  }

  function useCreate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ input, key }: { input: Create; key: string }) =>
        api<T>('POST', base, { body: input, idempotencyKey: key }),
      onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
    });
  }

  function useUpdate(id: string) {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ input, key }: { input: Update; key: string }) =>
        api<T>('PUT', `${base}/${id}`, { body: input, idempotencyKey: key }),
      onSuccess: (data) => {
        qc.setQueryData(keys.detail(id), data);
        return qc.invalidateQueries({ queryKey: keys.all });
      },
    });
  }

  function useSetActive(id: string) {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (active: boolean) => api<T>('PATCH', `${base}/${id}/status`, { body: { active } }),
      onSuccess: (data) => {
        qc.setQueryData(keys.detail(id), data);
        return qc.invalidateQueries({ queryKey: keys.all });
      },
    });
  }

  return { keys, useList, useOne, useCreate, useUpdate, useSetActive };
}
