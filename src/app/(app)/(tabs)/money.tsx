import { router } from 'expo-router';
import { Fragment } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useQueries } from '@tanstack/react-query';

import { api, errorMessage } from '@/api/client';
import { branches } from '@/api/resources';
import type { OpenSale } from '@/api/types';
import { ChevronRightIcon } from '@/components/icons';
import { AppearList, CountText, useFirstBatch } from '@/components/motion';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Card, ErrorBanner, ListRow, SectionHeader, Separator, TextLink } from '@/components/ui';
import { useExpenses } from '@/features/expenses-api';
import { useSettlements } from '@/features/money-api';
import { PaymentRow, TitleWithLink, unpaidLine } from '@/features/payment-ui';
import { sum, toUnits } from '@/lib/decimal';
import { colomboToday, formatRupees } from '@/lib/format';
import { colors, space } from '@/theme/tokens';

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
    <Screen
      title="Money"
      left={<></>}
      right={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <TextLink title="+ Expense" onPress={() => router.push('/expenses/new')} />
          <TextLink title="Record payment" pill onPress={() => router.push('/payments/new')} />
        </View>
      }
      inlineActions
      titleGap={20}
      bodyPaddingTop={24}
      bodyGap={32}
      headerExtra={
        <View style={{ gap: 4 }}>
          <Text variant="caption">Branches owe you</Text>
          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ alignSelf: 'flex-start' }} />
          ) : (
            <CountText variant="numDisplay" value={total} format={formatRupees} />
          )}
        </View>
      }>
      {branchList.isError ? <ErrorBanner message={errorMessage(branchList.error)} onRetry={branchList.refetch} /> : null}

      <View style={{ gap: space.sm }}>
        <SectionHeader title="By branch" />
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
                    {owes ? formatRupees(owes) : '…'}
                  </Text>
                  <ChevronRightIcon size={16} color="#AEAEB2" />
                </Pressable>
              </Fragment>
            );
          })}
        </Card>
      </View>

      <View style={{ gap: space.sm }}>
        <SectionHeader title="Expenses" />
        <Card>
          <ListRow
            title="This month"
            subtitle="Rent, salaries and other running costs"
            right={
              <Text variant="mono" style={{ color: colors.ink }}>
                {monthExpenses.data ? formatRupees(expenseTotal) : '…'}
              </Text>
            }
            chevron
            onPress={() => router.push('/expenses')}
          />
        </Card>
      </View>

      <View style={{ gap: space.sm }}>
        <TitleWithLink title="Recent payments" link={payments.data?.length ? 'See all' : undefined} onPress={() => router.push('/payments')} />
        {payments.isPending ? <ActivityIndicator color={colors.accent} /> : null}
        {payments.isSuccess && payments.data.length === 0 ? (
          <Card style={{ padding: space.xl, alignItems: 'center' }}>
            <Text variant="caption">No payments recorded yet.</Text>
          </Card>
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
