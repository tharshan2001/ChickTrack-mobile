import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { branches, products } from '@/api/resources';
import { DateField } from '@/components/date-field';
import { Segmented } from '@/components/pickers';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Card, ErrorBanner, IconButton, Separator, TextLink } from '@/components/ui';
import { useBranchSales } from '@/features/branch-api';
import { useOpenSales } from '@/features/money-api';
import { PaymentBadge, paymentState } from '@/features/sale-status';
import { formatKgShort, sum } from '@/lib/decimal';
import { addDays, colomboToday, formatDayHeading, formatRupees, formatRupeesCompact, formatShortDate, weekStart } from '@/lib/format';
import { colors, space } from '@/theme/tokens';

type Period = 'today' | 'week' | 'month' | 'custom';

function rangeFor(period: Period, custom: { from: string; to: string }) {
  const today = colomboToday();
  if (period === 'today') return { from: today, to: today };
  if (period === 'week') return { from: weekStart(today), to: today };
  if (period === 'month') return { from: `${today.slice(0, 7)}-01`, to: today };
  return custom;
}

function Tile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card style={{ flex: 1, padding: space.md, gap: space.xs }}>
      <Text variant="footnote">{label}</Text>
      <Text variant="mono" numberOfLines={1} style={color ? { color } : undefined}>
        {value}
      </Text>
    </Card>
  );
}

export default function BranchSales() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const branch = branches.useOne(id);
  const productList = products.useList('');
  const productName = (pid: string) => productList.data?.content.find((p) => p.id === pid)?.name ?? 'Product';
  const [period, setPeriod] = useState<Period>('week');
  const [custom, setCustom] = useState(() => ({ from: addDays(colomboToday(), -30), to: colomboToday() }));
  const range = rangeFor(period, custom);
  const sales = useBranchSales(id, range.from, range.to);
  const open = useOpenSales(id);
  const list = sales.data ?? [];
  const today = colomboToday();
  const missingToday = branch.data?.active && range.from <= today && range.to >= today && !list.some((s) => s.saleDate === today);
  const kg = sum(
    list.flatMap((s) => s.items.map((i) => i.weightKg)),
    3,
  );
  const enter = (date?: string) => router.push({ pathname: '/branches/[id]/sales', params: date ? { id, date } : { id } });

  return (
    <Screen
      title="Sales"
      subtitle={branch.data?.name}
      left={<IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />}
      right={branch.data?.active ? <TextLink title="+ Record" pill onPress={() => enter()} /> : undefined}
      bodyGap={10}
      bodyPaddingTop={12}
      headerExtra={
        <View style={{ gap: space.md }}>
          <Segmented
            label="Period"
            hideLabel
            compact
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
              { value: 'custom', label: 'Custom' },
            ]}
          />
          {period === 'custom' ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <DateField label="From" value={custom.from} onChange={(from) => setCustom((c) => ({ ...c, from }))} compact />
              </View>
              <View style={{ flex: 1 }}>
                <DateField label="To" value={custom.to} onChange={(to) => setCustom((c) => ({ ...c, to }))} compact />
              </View>
            </View>
          ) : (
            <Text variant="caption">
              {range.from === range.to ? formatDayHeading(range.from) : `${formatShortDate(range.from)} – ${formatShortDate(range.to)}`}
            </Text>
          )}
        </View>
      }>
      {sales.isError ? <ErrorBanner message={errorMessage(sales.error)} onRetry={sales.refetch} /> : null}

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Tile label="Sales" value={formatRupeesCompact(sum(list.map((s) => s.totalSales), 2))} />
        <Tile label="Profit" value={formatRupeesCompact(sum(list.map((s) => s.branchProfit), 2))} color={colors.success} />
        <Tile label="Sold" value={formatKgShort(kg)} />
      </View>

      {missingToday ? (
        <Card>
          <Pressable
            accessibilityRole="button"
            onPress={() => enter()}
            style={({ pressed }) => ({
              minHeight: 56,
              paddingHorizontal: space.lg,
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.md,
              backgroundColor: pressed ? colors.field : 'transparent',
            })}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warningDot }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyMedium">Today · {formatDayHeading(today)}</Text>
              <Text variant="caption">Not entered yet</Text>
            </View>
            <Text variant="bodyMedium" style={{ color: colors.accent }}>
              Enter
            </Text>
          </Pressable>
        </Card>
      ) : null}

      {sales.isPending ? <ActivityIndicator color={colors.accent} /> : null}
      {sales.isSuccess && list.length === 0 && !missingToday ? (
        <Card style={{ padding: space.xl, alignItems: 'center' }}>
          <Text variant="caption">No sales in this period.</Text>
        </Card>
      ) : null}

      {list.length ? (
        <Card>
          {list.map((s, i) => {
            const status = paymentState(s, open.data);
            const names = [...new Set(s.items.map((it) => productName(it.chickenTypeId)))].join(', ');
            const saleKg = sum(
              s.items.map((it) => it.weightKg),
              3,
            );
            return (
              <Fragment key={s.id}>
                {i > 0 ? <Separator /> : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/sales/[id]', params: { id: s.id } })}
                  style={({ pressed }) => ({
                    minHeight: 68,
                    paddingHorizontal: space.lg,
                    paddingVertical: space.sm,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                    backgroundColor: pressed ? colors.field : 'transparent',
                  })}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text variant="bodyMedium">{s.saleDate === today ? `Today · ${formatDayHeading(s.saleDate)}` : formatDayHeading(s.saleDate)}</Text>
                    <Text variant="caption" numberOfLines={1}>
                      <Text variant="monoSmall" style={{ color: colors.secondary }}>
                        {formatKgShort(saleKg)}
                      </Text>
                      {names ? ` · ${names}` : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: space.xs }}>
                    <Text variant="mono">{formatRupees(s.totalSales).replace('Rs ', '')}</Text>
                    {open.data ? <PaymentBadge state={status.state} /> : null}
                  </View>
                </Pressable>
              </Fragment>
            );
          })}
        </Card>
      ) : null}
    </Screen>
  );
}
