import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type Page } from '@/api/client';
import type { Role, User, UserCreateInput, UserCredentials, UserUpdateInput } from '@/api/types';
import { signInWithPassword } from '@/auth/session';

const base = '/api/v1/users';

export const userKeys = {
  all: ['users'] as const,
  list: (search: string) => ['users', 'list', search] as const,
  detail: (id: string) => ['users', 'detail', id] as const,
};

export function useUsers(search: string, enabled = true) {
  return useQuery({
    queryKey: userKeys.list(search),
    enabled,
    queryFn: () => api<Page<User>>('GET', base, { query: { search: search.trim(), size: 200, sort: 'fullName' } }),
  });
}

export function useUser(id: string) {
  return useQuery({ queryKey: userKeys.detail(id), queryFn: () => api<User>('GET', `${base}/${id}`) });
}

export function useRoles() {
  return useQuery({ queryKey: ['roles'], queryFn: () => api<Role[]>('GET', '/api/v1/roles'), staleTime: 60 * 60_000 });
}

function useSaved(id?: string) {
  const qc = useQueryClient();
  return (user: User) => {
    qc.setQueryData(userKeys.detail(id ?? user.id), user);
    return qc.invalidateQueries({ queryKey: userKeys.all });
  };
}

export function useCreateUser() {
  const saved = useSaved();
  return useMutation({
    mutationFn: ({ input, key }: { input: UserCreateInput; key: string }) =>
      api<UserCredentials>('POST', base, { body: input, idempotencyKey: key }),
    onSuccess: (user) => saved(user),
  });
}

export function useUpdateUser(id: string) {
  const saved = useSaved(id);
  return useMutation({
    mutationFn: ({ input, key }: { input: UserUpdateInput; key: string }) =>
      api<User>('PUT', `${base}/${id}`, { body: input, idempotencyKey: key }),
    onSuccess: saved,
  });
}

export function useSetAccess(id: string) {
  const saved = useSaved(id);
  return useMutation({
    mutationFn: async ({ roles, branchIds }: { roles: string[]; branchIds: string[] }) => {
      await api<User>('PUT', `${base}/${id}/roles`, { body: { roles } });
      return api<User>('PUT', `${base}/${id}/branches`, { body: { branchIds } });
    },
    onSuccess: saved,
  });
}

export function useSetUserActive(id: string) {
  const saved = useSaved(id);
  return useMutation({
    mutationFn: (active: boolean) => api<User>('PATCH', `${base}/${id}/status`, { body: { active } }),
    onSuccess: saved,
  });
}

export function useResetPassword(id: string) {
  const saved = useSaved(id);
  return useMutation({
    mutationFn: () => api<UserCredentials>('POST', `${base}/${id}/password`, { body: {} }),
    onSuccess: (user) => saved(user),
  });
}

export function useChangeOwnPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { username: string; currentPassword: string; newPassword: string }) => {
      await api<User>('POST', '/api/v1/me/password', {
        body: { currentPassword: p.currentPassword, newPassword: p.newPassword },
      });
      await signInWithPassword(p.username, p.newPassword);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}
