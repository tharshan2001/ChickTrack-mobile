import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { suppliers } from '@/api/resources';
import type { Procurement } from '@/api/types';
import { Segmented } from '@/components/pickers';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Card, ErrorBanner, IconButton, Separator } from '@/components/ui';
import { useProcurements } from '@/features/stock-api';
import { formatKg, sum } from '@/lib/decimal';
import { colomboToday, formatDayHeading, formatRupees, weekStart } from '@/lib/format';
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
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'today', label: 'Today' },
          { value: 'week', label: 'This week' },
          { value: 'month', label: 'This month' },
        ]}
      />

      <View style={{ flexDirection: 'row', paddingHorizontal: space.xs }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="caption">Bought</Text>
          <Text variant="mono" style={{ fontSize: 18 }}>
            {formatKg(sum(list.map((p) => p.paidWeightKg), 3))}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="caption">Spent</Text>
          <Text variant="mono" style={{ fontSize: 18 }}>
            {formatRupees(sum(list.map((p) => p.totalCost), 2), 0)}
          </Text>
        </View>
      </View>

      {query.isError ? <ErrorBanner message={errorMessage(query.error)} onRetry={query.refetch} /> : null}
      {query.isPending ? <ActivityIndicator color={colors.accent} /> : null}

      {query.isSuccess && list.length === 0 ? (
        <Card style={{ padding: space.xl, alignItems: 'center', gap: space.sm }}>
          <Text variant="bodyMedium">No purchases in this period</Text>
          <Text variant="caption" style={{ textAlign: 'center' }}>
            Tap + to record what you bought.
          </Text>
        </Card>
      ) : null}

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
                      <Text variant="mono" style={{ fontSize: 13, color: colors.secondary }}>
                        {p.reference}
                      </Text>
                    </Text>
                    <Text variant="mono" style={{ fontSize: 13, color: colors.secondary }}>
                      {formatKg(p.paidWeightKg)}
                    </Text>
                  </View>
                </Pressable>
              </Fragment>
            ))}
          </Card>
        </View>
      ))}
    </Screen>
  );
}
