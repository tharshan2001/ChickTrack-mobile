import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { branches } from '@/api/resources';
import type { Settlement } from '@/api/types';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Card, ErrorBanner, IconButton, Separator, TextLink } from '@/components/ui';
import { useSettlements } from '@/features/money-api';
import { PaymentRow } from '@/features/payment-ui';
import { colors, fonts, space } from '@/theme/tokens';

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 32,
        paddingHorizontal: space.md,
        borderRadius: 16,
        justifyContent: 'center',
        backgroundColor: on ? colors.ink : colors.field,
        opacity: pressed ? 0.7 : 1,
      })}>
      <Text variant="caption" style={{ color: on ? colors.surface : colors.ink, fontFamily: on ? fonts.bodyMedium : fonts.body, letterSpacing: 0 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const monthLabel = (iso: string) => {
  const [y, m] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y!, m! - 1, 1)));
};

/** Every payment, newest first, grouped by month; filter to one branch with the chips. */
export default function PaymentsList() {
  const params = useLocalSearchParams<{ branchId?: string }>();
  const [branchId, setBranchId] = useState<string | undefined>(params.branchId);
  const branchList = branches.useList('');
  const list = branchList.data?.content ?? [];
  const payments = useSettlements(branchId);
  const branchName = (id: string) => list.find((b) => b.id === id)?.name ?? 'Branch';

  const groups = new Map<string, Settlement[]>();
  for (const p of payments.data ?? []) {
    const k = p.settlementDate.slice(0, 7);
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }

  return (
    <Screen
      title="Payments"
      left={<IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />}
      right={
        <TextLink
          title="Record payment"
          pill
          onPress={() => router.push({ pathname: '/payments/new', params: branchId ? { branchId } : {} })}
        />
      }
      headerExtra={
        list.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            <Chip label="All branches" on={!branchId} onPress={() => setBranchId(undefined)} />
            {list.map((b) => (
              <Chip key={b.id} label={b.name} on={branchId === b.id} onPress={() => setBranchId(b.id)} />
            ))}
          </ScrollView>
        ) : undefined
      }
      bodyGap={space.md}>
      {payments.isError ? <ErrorBanner message={errorMessage(payments.error)} onRetry={payments.refetch} /> : null}
      {payments.isPending ? <ActivityIndicator color={colors.accent} /> : null}
      {payments.isSuccess && payments.data.length === 0 ? (
        <Card style={{ padding: space.xl, alignItems: 'center' }}>
          <Text variant="caption">No payments yet.</Text>
        </Card>
      ) : null}
      {[...groups.entries()].map(([month, rows]) => (
        <View key={month} style={{ gap: space.sm }}>
          <Text variant="labelSmall">{monthLabel(month)}</Text>
          <Card>
            {rows.map((p, i) => (
              <Fragment key={p.id}>
                {i > 0 ? <Separator /> : null}
                <PaymentRow p={p} branch={branchId ? undefined : branchName(p.branchId)} />
              </Fragment>
            ))}
          </Card>
        </View>
      ))}
    </Screen>
  );
}
