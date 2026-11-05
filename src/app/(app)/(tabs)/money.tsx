import { router } from 'expo-router';
import { Fragment } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useQueries } from '@tanstack/react-query';

import { api, errorMessage } from '@/api/client';
import { branches } from '@/api/resources';
import type { OpenSale } from '@/api/types';
import { EmptyState } from '@/components/empty-state';
import { ActionButton } from '@/components/action-button';
import { ChevronRightIcon } from '@/components/icons';
import { AppearList, CountText, useFirstBatch } from '@/components/motion';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Card, ErrorBanner, SectionHeader, Separator } from '@/components/ui';
import { useExpenses } from '@/features/expenses-api';
import { useSettlements } from '@/features/money-api';
import { PaymentRow, TitleWithLink, unpaidLine } from '@/features/payment-ui';
import { sum, toUnits } from '@/lib/decimal';
import { colomboToday, formatRupees } from '@/lib/format';
import { colors, fonts, space } from '@/theme/tokens';

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
  const openSales = useQueries({
    queries: list.map((b) => ({
      queryKey: ['open-sales', b.id],
      queryFn: () => api<OpenSale[]>('GET', `/api/v1/branches/${b.id}/open-sales`),
    })),
  });
  const payments = useSettlements();
  const firstPayments = useFirstBatch(payments.isSuccess);
  const thisMonth = colomboToday().slice(0, 7);
  const monthExpenses = useExpenses(`${thisMonth}-01`, colomboToday());
  const expenseTotal = sum(
    (monthExpenses.data ?? []).filter((e) => e.status === 'POSTED').map((e) => e.amount),
    2,
  );

  const rows = list
    .map((b, i) => ({ b, owes: balances[i]?.data ?? null, unpaid: openSales[i]?.data }))
    .sort((x, y) => Number(toUnits(y.owes ?? '0', 2) - toUnits(x.owes ?? '0', 2)));
  const total = sum(
    rows.map((r) => r.owes),
    2,
  );
  const branchName = (id: string) => list.find((b) => b.id === id)?.name ?? 'Branch';
  const loading = branchList.isPending || balances.some((q) => q.isPending);

  return (
    <Screen title="Money" titleVariant="tabTitle" bodyGap={space.xl} bodyPaddingTop={space.sm}>
        <View style={{ gap: space.lg }}>
          <Card style={{ borderWidth: 1, borderColor: 'rgba(162, 8, 12, 0.25)' }}>
            <View style={{ paddingVertical: 14, paddingHorizontal: space.lg, gap: 2 }}>
              <Text variant="caption">Branches owe you</Text>
              {loading ? (
                <ActivityIndicator color={colors.accent} style={{ alignSelf: 'flex-start', marginVertical: 8 }} />
              ) : (
                <CountText variant="numMoney" value={total} format={formatRupees} numberOfLines={1} adjustsFontSizeToFit />
              )}
            </View>
            <Separator inset={space.lg} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Expenses this month, ${formatRupees(expenseTotal)}`}
              onPress={() => router.push('/expenses')}
              style={({ pressed }) => ({
                minHeight: 44,
                paddingLeft: space.lg,
                paddingRight: space.md,
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.sm,
                opacity: pressed ? 0.6 : 1,
              })}>
              <Text variant="caption" style={{ flex: 1 }} numberOfLines={1}>
                <Text variant="caption" style={{ fontFamily: fonts.bodyMedium, color: colors.ink }}>
                  Expenses
                </Text>
                {' · this month'}
              </Text>
              <Text variant="monoSmall">{monthExpenses.data ? formatRupees(expenseTotal).replace('Rs ', '') : '…'}</Text>
              <ChevronRightIcon size={16} color="#AEAEB2" />
            </Pressable>
          </Card>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <ActionButton icon="plus" title="Payment" primary onPress={() => router.push('/payments/new')} />
            <ActionButton icon="receipt" title="Expense" onPress={() => router.push('/expenses/new')} />
          </View>
        </View>
      {branchList.isError ? <ErrorBanner message={errorMessage(branchList.error)} onRetry={branchList.refetch} /> : null}

      <View style={{ gap: space.sm }}>
        <SectionHeader title="By branch" size="small" />
        <Card>
          {rows.map(({ b, owes, unpaid }, i) => {
            const owing = !!owes && toUnits(owes, 2) > 0n;
            return (
              <Fragment key={b.id}>
                {i > 0 ? <Separator /> : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${b.name}, owes ${owes ? formatRupees(owes) : 'loading'}`}
                  onPress={() => router.push({ pathname: '/branches/[id]/money', params: { id: b.id } })}
                  style={({ pressed }) => ({
                    minHeight: 64,
                    paddingLeft: space.lg,
                    paddingRight: space.md,
                    paddingVertical: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                    backgroundColor: pressed ? colors.field : 'transparent',
                  })}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyMedium" style={{ color: b.active ? colors.ink : colors.secondary }}>
                      {b.name}
                      {!b.active ? <Text variant="caption"> · closed</Text> : null}
                    </Text>
                    {unpaidLine(unpaid) ? (
                      <Text variant="caption" numberOfLines={1}>
                        {unpaidLine(unpaid)}
                      </Text>
                    ) : null}
                  </View>
                  <Text variant="mono" style={{ color: owing ? colors.ink : colors.secondary }}>
                    {owes ? formatRupees(owes).replace('Rs ', '') : '…'}
                  </Text>
                  <ChevronRightIcon size={16} color="#AEAEB2" />
                </Pressable>
              </Fragment>
            );
          })}
        </Card>
      </View>

      <View style={{ gap: space.sm }}>
        <TitleWithLink small title="Recent payments" link={payments.data?.length ? 'See all' : undefined} onPress={() => router.push('/payments')} />
        {payments.isPending ? <ActivityIndicator color={colors.accent} /> : null}
        {payments.isSuccess && payments.data.length === 0 ? (
          <EmptyState
            icon="credit-card"
            tone="brand"
            title="No payments yet"
            text="When a branch pays you, record it here and it comes off what they owe."
          />
        ) : null}
        {payments.data?.length ? (
          <Card>
            <AppearList still={firstPayments}>
              {payments.data.slice(0, 5).map((p, i) => (
              <Fragment key={p.id}>
                {i > 0 ? <Separator /> : null}
                <PaymentRow p={p} branch={branchName(p.branchId)} />
              </Fragment>
            ))}
            </AppearList>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}
