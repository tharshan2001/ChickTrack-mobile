import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { suppliers } from '@/api/resources';
import type { Procurement } from '@/api/types';
import { EmptyState } from '@/components/empty-state';
import { Segmented } from '@/components/pickers';
import { AppearList, CountText, useFirstBatch } from '@/components/motion';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Card, ErrorBanner, IconButton, Separator } from '@/components/ui';
import { useProcurements } from '@/features/stock-api';
import { formatKgShort, formatKgWhole, sum } from '@/lib/decimal';
import { colomboToday, formatDayHeading, formatRupees, formatShortDate, weekStart } from '@/lib/format';
import { colors, space } from '@/theme/tokens';

type Period = 'today' | 'week' | 'month';

function range(period: Period): [string, string] {
  const today = colomboToday();
  if (period === 'today') return [today, today];
  if (period === 'week') return [weekStart(today), today];
  return [`${today.slice(0, 8)}01`, today];
}

export default function Purchases() {
  const [period, setPeriod] = useState<Period>('week');
  const [from, to] = range(period);
  const query = useProcurements(from, to);
  const firstLoad = useFirstBatch(query.isSuccess);
  const supplierList = suppliers.useList('');
  const supplierName = (id: string) => supplierList.data?.content.find((s) => s.id === id)?.name ?? 'Supplier';

  const list = (query.data?.content ?? []).filter((p) => p.status !== 'REVERSED');
  const byDay = new Map<string, Procurement[]>();
  for (const p of list) byDay.set(p.procurementDate, [...(byDay.get(p.procurementDate) ?? []), p]);

  return (
    <Screen
      title="Purchases"
      subtitle="Stock you bought from suppliers"
      left={<IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />}
      right={<IconButton icon="plus" label="New purchase" filled onPress={() => router.push('/purchases/new')} />}>
      <Segmented
        label="Period"
        hideLabel
        compact
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'today', label: 'Today' },
          { value: 'week', label: 'This week' },
          { value: 'month', label: 'This month' },
        ]}
      />

      <View style={{ flexDirection: 'row', paddingHorizontal: space.xs, gap: space.sm }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="caption">Bought</Text>
          <CountText value={sum(list.map((p) => p.paidWeightKg), 3)} decimals={3} format={formatKgWhole} variant="num" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="caption">Spent</Text>
          <CountText value={sum(list.map((p) => p.totalCost), 2)} format={(v) => formatRupees(v, 0)} variant="num" />
        </View>
      </View>

      {query.isError ? <ErrorBanner message={errorMessage(query.error)} onRetry={query.refetch} /> : null}
      {query.isPending ? <ActivityIndicator color={colors.accent} /> : null}

      {query.isSuccess && list.length === 0 ? (
        <EmptyState
          icon="shopping-cart"
          title="No purchases in this period"
          text="Pick another period, or record what you bought."
        />
      ) : null}

      <AppearList still={firstLoad}>
        {[...byDay.entries()].map(([day, rows]) => (
        <View key={day} style={{ gap: space.sm }}>
          <Text variant="caption" style={{ paddingHorizontal: space.xs }}>
            {formatDayHeading(day)}
          </Text>
          <Card>
            {rows.map((p, i) => (
              <Fragment key={p.id}>
                {i > 0 ? <Separator /> : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/purchases/[id]', params: { id: p.id } })}
                  style={({ pressed }) => ({
                    minHeight: 72,
                    paddingHorizontal: space.lg,
                    paddingVertical: space.md,
                    gap: 4,
                    backgroundColor: pressed ? colors.field : 'transparent',
                  })}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
                    <Text variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>
                      {supplierName(p.supplierId)}
                    </Text>
                    <Text variant="mono">{formatRupees(p.totalCost)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="caption">
                      <Text variant="monoSmall" style={{ color: colors.secondary }}>
                        {p.reference}
                      </Text>{' '}
                      · {formatShortDate(p.procurementDate)}
                    </Text>
                    <Text variant="monoSmall" style={{ color: colors.secondary }}>
                      {formatKgShort(p.paidWeightKg)}
                    </Text>
                  </View>
                </Pressable>
              </Fragment>
            ))}
          </Card>
        </View>
      ))}
      </AppearList>
    </Screen>
  );
}
