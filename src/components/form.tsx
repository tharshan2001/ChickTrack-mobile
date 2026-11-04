import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Switch, View } from 'react-native';

import { ApiError, errorMessage, newIdempotencyKey, nextKeyAfter } from '@/api/client';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Card, ErrorBanner, TextLink } from '@/components/ui';
import { colors, space } from '@/theme/tokens';

/** Simple form state: values plus a typed setter per field. */
export function useFormValues<T extends Record<string, string>>(initial: T) {
  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState(false);
  const set = (field: keyof T) => (v: string) => setValues((s) => ({ ...s, [field]: v }));
  return { values, set, touched, setTouched };
}

/** Trims; empty optional text becomes null, as the API expects. */
export const optional = (v: string) => v.trim() || null;

/**
 * Idempotency key for one form. It stays the same across retries after a network
 * failure and changes once the server has answered (see nextKeyAfter).
 */
export function useIdempotencyKey() {
  const [key, setKey] = useState(newIdempotencyKey);
  return { key, onError: (e: unknown) => setKey(nextKeyAfter(e, key)) };
}

export function fieldErrors(error: unknown): Record<string, string> {
  return error instanceof ApiError ? error.fieldErrors : {};
}

/** Banner for errors that aren't tied to a field (duplicate name, forbidden, offline). */
export function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  if (error instanceof ApiError && Object.keys(error.fieldErrors).length) return null;
  return <ErrorBanner message={errorMessage(error)} />;
}

/** Loads a record by id, then renders the edit form with it. */
export function EditLoader<T>({
  title,
  query,
  children,
}: {
  title: string;
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
}) {
  if (query.data) return <>{children(query.data)}</>;
  return (
    <Screen title={title} left={<TextLink title="Cancel" onPress={() => router.back()} />}>
      {query.isError ? (
        <ErrorBanner message={errorMessage(query.error)} onRetry={query.refetch} />
      ) : (
        <ActivityIndicator color={colors.accent} />
      )}
    </Screen>
  );
}

/** Active on/off card for edit screens; saves immediately via PATCH …/status. */
export function ActiveSwitch({
  active,
  mutation,
  onText,
  offText,
}: {
  active: boolean;
  mutation: UseMutationResult<unknown, Error, boolean>;
  onText: string;
  offText: string;
}) {
  const shown = mutation.isPending ? !active : active;
  return (
    <>
      <Card style={{ padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyMedium">Active</Text>
          <Text variant="caption">{shown ? onText : offText}</Text>
        </View>
        <Switch
          accessibilityLabel="Active"
          value={shown}
          disabled={mutation.isPending}
          onValueChange={(v) => mutation.mutate(v)}
          trackColor={{ true: colors.success, false: colors.separator }}
          thumbColor={colors.surface}
        />
      </Card>
      {mutation.isError ? <ErrorBanner message={errorMessage(mutation.error)} /> : null}
    </>
  );
}
