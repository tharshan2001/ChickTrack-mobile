import { router } from 'expo-router';
import { Fragment } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useQueries } from '@tanstack/react-query';

import { api, errorMessage } from '@/api/client';
import { branches } from '@/api/resources';
import type { Settlement } from '@/api/types';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Card, ErrorBanner, SectionHeader, Separator, TextLink } from '@/components/ui';
import { METHOD_LABEL, useSettlements } from '@/features/money-api';
import { sum, toUnits } from '@/lib/decimal';
import { formatRupees } from '@/lib/format';
import { colors, space } from '@/theme/tokens';

const shortDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y!, m! - 1, d!)),
  );
};

export default function MoneyTab() {
  const branchList = branches.useList('');
  const list = branchList.data?.content ?? [];
  const balances = useQueries({
    queries: list.map((b) => ({
      queryKey: ['branch-balance', b.id],
      queryFn: () =>
        api<{ outstandingAmount: string }>('GET', `/api/v1/branches/${b.id}/balance`).then((r) => r.outstandingAmount),
    })),
  });
  const payments = useSettlements();

  const rows = list
    .map((b, i) => ({ b, owes: balances[i]?.data ?? null }))
    .sort((x, y) => Number(toUnits(y.owes ?? '0', 2) - toUnits(x.owes ?? '0', 2)));
  const total = sum(
    rows.map((r) => r.owes),
    2,
  );
  const max = rows.reduce((m, r) => (toUnits(r.owes ?? '0', 2) > m ? toUnits(r.owes ?? '0', 2) : m), 0n);
  const branchName = (id: string) => list.find((b) => b.id === id)?.name ?? 'Branch';
  const loading = branchList.isPending || balances.some((q) => q.isPending);

  return (
    <Screen title="Money" left={<></>} right={<TextLink title="+ Payment" onPress={() => router.push('/payments/new')} />}>
      <View style={{ gap: 2, paddingHorizontal: space.xs }}>
        <Text variant="caption">Branches owe you</Text>
        {loading ? <ActivityIndicator color={colors.accent} style={{ alignSelf: 'flex-start' }} /> : <Text variant="numLarge">{formatRupees(total)}</Text>}
      </View>

      {branchList.isError ? <ErrorBanner message={errorMessage(branchList.error)} onRetry={branchList.refetch} /> : null}

      <View style={{ gap: space.sm }}>
        <SectionHeader title="By branch" />
        <Card>
          {rows.map(({ b, owes }, i) => {
            const pct = max > 0n && owes ? Number((toUnits(owes, 2) * 1000n) / max) / 10 : 0;
            return (
              <Fragment key={b.id}>
                {i > 0 ? <Separator /> : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/branches/[id]', params: { id: b.id } })}
                  style={({ pressed }) => ({
                    paddingHorizontal: space.lg,
                    paddingVertical: space.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                    backgroundColor: pressed ? colors.field : 'transparent',
                  })}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text variant="bodyMedium" style={{ color: b.active ? colors.ink : colors.secondary }}>
                      {b.name}
                      {!b.active ? <Text variant="caption"> · closed</Text> : null}
                    </Text>
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.field, overflow: 'hidden' }}>
                      <View style={{ width: `${pct}%`, height: 4, backgroundColor: colors.accent }} />
                    </View>
                  </View>
                  <Text variant="mono" style={{ color: owes && toUnits(owes, 2) > 0n ? colors.ink : colors.secondary }}>
                    {owes ? formatRupees(owes).replace('Rs ', '') : '…'}
                  </Text>
                </Pressable>
              </Fragment>
            );
          })}
        </Card>
      </View>

      <View style={{ gap: space.sm }}>
        <SectionHeader title="Recent payments" />
        {payments.isPending ? <ActivityIndicator color={colors.accent} /> : null}
        {payments.isSuccess && payments.data.length === 0 ? (
          <Card style={{ padding: space.xl, alignItems: 'center' }}>
            <Text variant="caption">No payments recorded yet.</Text>
          </Card>
        ) : null}
        {payments.data?.length ? (
          <Card>
            {payments.data.slice(0, 20).map((p: Settlement, i) => {
              const reversed = p.status === 'REVERSED';
              return (
                <Fragment key={p.id}>
                  {i > 0 ? <Separator /> : null}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: '/payments/[id]', params: { id: p.id } })}
                    style={({ pressed }) => ({
                      paddingHorizontal: space.lg,
                      paddingVertical: space.md,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.md,
                      backgroundColor: pressed ? colors.field : 'transparent',
                    })}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text numberOfLines={1}>
                        {branchName(p.branchId)} · {METHOD_LABEL[p.method] ?? p.method.toLowerCase()}
                        {p.reference ? (
                          <Text variant="monoSmall" style={{ color: colors.secondary }}>
                            {' '}
                            · {p.reference}
                          </Text>
                        ) : null}
                      </Text>
                      <Text variant="caption" style={reversed ? { color: colors.danger } : undefined}>
                        {reversed ? `Reversed · ${p.reversalReason ?? ''}` : shortDate(p.settlementDate)}
                      </Text>
                    </View>
                    <Text
                      variant="mono"
                      style={reversed ? { color: colors.secondary, textDecorationLine: 'line-through' } : undefined}>
                      {formatRupees(p.amount).replace('Rs ', '')}
                    </Text>
                  </Pressable>
                </Fragment>
              );
            })}
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}
