import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { errorMessage } from '@/api/client';
import type { OperatingExpense } from '@/api/types';
import { EmptyState } from '@/components/empty-state';
import { Segmented } from '@/components/pickers';
import { AppearList, useFirstBatch } from '@/components/motion';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Badge, Card, ErrorBanner, IconButton, Notice, Separator } from '@/components/ui';
import { useExpenses, type ExpenseScope } from '@/features/expenses-api';
import { MonthStepper, monthRange, shiftMonth } from '@/features/month-stepper';
import { monthName } from '@/features/profit-loss-api';
import { sum } from '@/lib/decimal';
import { colomboToday, formatDayHeading, formatRupees } from '@/lib/format';
import { colors, space } from '@/theme/tokens';

function byDay(list: OperatingExpense[]) {
  const days: { date: string; items: OperatingExpense[] }[] = [];
  for (const e of list) {
    const last = days[days.length - 1];
    if (last?.date === e.expenseDate) last.items.push(e);
    else days.push({ date: e.expenseDate, items: [e] });
  }
  return days;
}

export default function Expenses() {
  const [month, setMonth] = useState(colomboToday().slice(0, 7));
  const [scope, setScope] = useState<ExpenseScope>('all');
  const range = monthRange(month);
  const expenses = useExpenses(range.from, range.to, scope);
  const firstLoad = useFirstBatch(expenses.isSuccess);
  const list = expenses.data ?? [];
  const total = sum(
    list.filter((e) => e.status === 'POSTED').map((e) => e.amount),
    2,
  );
  const today = colomboToday();

  return (
    <Screen
      title="Expenses"
      subtitle={
        <>
          {monthName(month)} ·{' '}
          <Text variant="monoSmall" style={{ color: colors.ink }}>
            {formatRupees(total)}
          </Text>
        </>
      }
      left={<IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />}
      right={<IconButton icon="plus" label="Add expense" filled onPress={() => router.push('/expenses/new')} />}
      bodyGap={10}
      headerExtra={
        <View style={{ gap: space.sm }}>
          <MonthStepper
            label={monthName(month)}
            onPrevious={() => setMonth(shiftMonth(month, -1))}
            onNext={month < today.slice(0, 7) ? () => setMonth(shiftMonth(month, 1)) : undefined}
          />
          <Segmented
            label="Show"
            hideLabel
            compact
            value={scope}
            onChange={setScope}
            options={[
              { value: 'all', label: 'All' },
              { value: 'office', label: 'Head office' },
              { value: 'branches', label: 'Branches' },
            ]}
          />
        </View>
      }>
      {expenses.isError ? <ErrorBanner message={errorMessage(expenses.error)} onRetry={expenses.refetch} /> : null}
      {expenses.isPending ? <ActivityIndicator color={colors.accent} /> : null}
      {expenses.isSuccess && list.length === 0 ? (
        <EmptyState
          icon="file-text"
          title={`No expenses in ${monthName(month)}`}
          text="Pick another month, or add one for this month."
        />
      ) : null}
      <AppearList still={firstLoad}>
        {byDay(list).map((day) => (
        <View key={day.date} style={{ gap: space.sm }}>
          <Text variant="caption" style={{ fontWeight: '600', paddingHorizontal: space.xs, paddingTop: 6 }}>
            {day.date === today ? `Today · ${formatDayHeading(day.date).split(' ').slice(1).join(' ')}` : formatDayHeading(day.date)}
          </Text>
          <Card>
            {day.items.map((e, i) => {
              const voided = e.status === 'VOIDED';
              return (
                <Fragment key={e.id}>
                  {i > 0 ? <Separator /> : null}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: '/expenses/[id]', params: { id: e.id } })}
                    style={({ pressed }) => ({
                      minHeight: 64,
                      paddingHorizontal: space.lg,
                      paddingVertical: space.sm,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.md,
                      backgroundColor: pressed ? colors.field : 'transparent',
                    })}>
                    <View style={{ flex: 1, gap: 4, alignItems: 'flex-start' }}>
                      <Text variant="bodyMedium" numberOfLines={1} style={voided ? { color: colors.secondary } : undefined}>
                        {e.categoryName} · {e.branchName ?? 'Head office'}
                      </Text>
                      {voided ? (
                        <Badge label={`Voided · ${e.voidReason ?? ''}`} tone="danger" />
                      ) : (
                        <Text variant="caption" numberOfLines={1}>
                          {[e.payee, e.description].filter(Boolean).join(' · ') || e.reference}
                        </Text>
                      )}
                    </View>
                    <Text
                      variant="mono"
                      style={voided ? { color: colors.secondary, textDecorationLine: 'line-through' } : undefined}>
                      {formatRupees(e.amount).replace('Rs ', '')}
                    </Text>
                  </Pressable>
                </Fragment>
              );
            })}
          </Card>
        </View>
      ))}
      </AppearList>
      <Notice icon={false} text="Running costs only. Transport and ice on a purchase or a dispatch stay on that document." />
    </Screen>
  );
}
