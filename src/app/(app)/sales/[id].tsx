import { router, useLocalSearchParams } from 'expo-router';
import { Fragment } from 'react';
import { View } from 'react-native';

import { branches, products } from '@/api/resources';
import type { BranchSale } from '@/api/types';
import { EditLoader } from '@/components/form';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Button, Card, IconButton, SectionHeader, Separator, TextLink } from '@/components/ui';
import { useBranchSale } from '@/features/branch-api';
import { VarianceBadge } from '@/features/sale-status';
import { formatKg, toUnits } from '@/lib/decimal';
import { formatDayHeading, formatRupees } from '@/lib/format';
import { colors, space } from '@/theme/tokens';

const plain = (v: string) => formatRupees(v).replace('Rs ', '');

export default function SaleRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditLoader title="Day close" query={useBranchSale(id)}>{(s) => <Sale s={s} />}</EditLoader>;
}

function Line({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) {
  return (
    <View
      style={{
        minHeight: strong ? 48 : 44,
        paddingHorizontal: space.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
      <Text variant={strong ? 'bodyMedium' : 'body'} style={strong ? undefined : { color: colors.secondary }}>
        {label}
      </Text>
      <Text variant={strong ? 'num' : 'mono'} style={{ fontSize: strong ? 16 : 15, color: color ?? colors.ink }}>
        {value}
      </Text>
    </View>
  );
}

function Sale({ s }: { s: BranchSale }) {
  const branch = branches.useOne(s.branchId);
  const productList = products.useList('');
  const productName = (pid: string) => productList.data?.content.find((p) => p.id === pid)?.name ?? 'Product';
  const margin = toUnits(s.totalSales, 2) > 0n ? (Number(s.branchProfit) / Number(s.totalSales)) * 100 : null;

  return (
    <Screen
      title={branch.data?.name ?? 'Sale'}
      subtitle={
        <Text variant="monoSmall" style={{ color: colors.secondary, letterSpacing: 0.5 }}>
          {s.reference} · {formatDayHeading(s.saleDate)}
        </Text>
      }
      subtitleAbove
      left={<IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />}
      right={
        branch.data?.active ? (
          <TextLink
            title="Edit"
            onPress={() => router.push({ pathname: '/branches/[id]/sales', params: { id: s.branchId, date: s.saleDate } })}
          />
        ) : undefined
      }
      headerExtra={
        <View style={{ gap: 2, paddingTop: space.sm }}>
          <Text variant="numDisplay">{formatRupees(s.totalSales)}</Text>
          <Text variant="caption">
            Branch profit{' '}
            <Text variant="monoSmall" style={{ color: colors.success }}>
              {formatRupees(s.branchProfit)}
            </Text>
            {margin !== null ? ` · ${margin.toFixed(1)}%` : ''}
          </Text>
        </View>
      }
      footer={
        <Button
          title="Branch money"
          variant="secondary"
          onPress={() => router.push({ pathname: '/branches/[id]/money', params: { id: s.branchId } })}
        />
      }>
      <View style={{ gap: space.sm }}>
        <SectionHeader title="By product" />
        <Card>
          {s.items.map((it, i) => (
            <Fragment key={it.id}>
              {i > 0 ? <Separator /> : null}
              <View
                style={{
                  minHeight: 68,
                  paddingHorizontal: space.lg,
                  paddingVertical: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                }}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text variant="bodyMedium">{productName(it.chickenTypeId)}</Text>
                  <Text variant="monoSmall" style={{ color: colors.secondary }}>
                    {formatKg(it.openingWeightKg)} → {formatKg(it.closingWeightKg)} left
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 3 }}>
                  <Text variant="mono">{formatKg(it.weightKg)} sold</Text>
                  <Text variant="monoSmall" style={{ color: colors.secondary }}>
                    {it.sellingPricePerKg ? `@ ${plain(it.sellingPricePerKg)}/kg` : 'No price set'}
                  </Text>
                </View>
              </View>
            </Fragment>
          ))}
        </Card>
      </View>

      <Card>
        <Line label="Expected at branch price" value={s.expectedSales ? plain(s.expectedSales) : '—'} />
        <Separator />
        <Line label="Takings" value={plain(s.totalSales)} />
        <Separator />
        <View
          style={{ minHeight: 44, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="body" style={{ color: colors.secondary }}>
            Short / over
          </Text>
          {s.variance ? <VarianceBadge sale={s} /> : <Text variant="mono">—</Text>}
        </View>
      </Card>

      <Card>
        <Line label="Takings" value={plain(s.totalSales)} />
        <Separator />
        <Line label="Cost of stock sold" value={`−${plain(s.transferValue)}`} />
        <View style={{ height: 1, backgroundColor: colors.ink, marginHorizontal: space.lg }} />
        <Line
          label="Branch profit"
          value={plain(s.branchProfit)}
          strong
          color={s.branchProfit.startsWith('-') ? colors.danger : colors.success}
        />
      </Card>

      {s.notes ? (
        <Text variant="caption" style={{ paddingHorizontal: space.xs }}>
          Note: {s.notes}
        </Text>
      ) : null}
    </Screen>
  );
}
