import { router, useLocalSearchParams } from 'expo-router';
import { Fragment } from 'react';
import { View } from 'react-native';

import { branches, products } from '@/api/resources';
import type { BranchSale } from '@/api/types';
import { EditLoader } from '@/components/form';
import { GrowBar } from '@/components/motion';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Button, Card, IconButton, SectionHeader, Separator, TextLink } from '@/components/ui';
import { useBranchSale } from '@/features/branch-api';
import { useOpenSales } from '@/features/money-api';
import { PaymentBadge, paymentState } from '@/features/sale-status';
import { formatKg, fromUnits, toUnits } from '@/lib/decimal';
import { formatDayHeading, formatRupees } from '@/lib/format';
import { colors, space } from '@/theme/tokens';

const plain = (v: string) => formatRupees(v).replace('Rs ', '');
const signed = (v: string) => (v.startsWith('-') ? `−${plain(v.slice(1))}` : `+${plain(v)}`);

export default function SaleRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditLoader title="Sale" query={useBranchSale(id)}>{(s) => <Sale s={s} />}</EditLoader>;
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
  const open = useOpenSales(s.branchId);
  const status = paymentState(s, open.data);
  const owedUnits = toUnits(status.owed, 2);
  const paid = fromUnits(toUnits(s.transferValue, 2) - owedUnits, 2);
  const paidPct = toUnits(s.transferValue, 2) > 0n ? Number((toUnits(paid, 2) * 100n) / toUnits(s.transferValue, 2)) : 0;
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
      left={<IconButton icon="chevron-left" label="Back to sales" onPress={() => router.back()} />}
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
        owedUnits > 0n ? (
          <Button title="Record payment" onPress={() => router.push({ pathname: '/payments/new', params: { branchId: s.branchId } })} />
        ) : undefined
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
                    {formatKg(it.weightKg)} × {plain(it.sellingPricePerKg)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 3 }}>
                  <Text variant="mono">{plain(it.revenue)}</Text>
                  <Text variant="monoSmall" style={{ color: it.profit.startsWith('-') ? colors.danger : colors.success }}>
                    {signed(it.profit)}
                  </Text>
                </View>
              </View>
            </Fragment>
          ))}
        </Card>
      </View>

      <Card>
        <Line label="Sales" value={plain(s.totalSales)} />
        <Separator />
        <Line label="Stock cost (owed to us)" value={`−${plain(s.transferValue)}`} />
        <View style={{ height: 1, backgroundColor: colors.ink, marginHorizontal: space.lg }} />
        <Line
          label="Branch profit"
          value={plain(s.branchProfit)}
          strong
          color={s.branchProfit.startsWith('-') ? colors.danger : colors.success}
        />
      </Card>

      {open.data ? (
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <SectionHeader title="Payment" />
            <PaymentBadge state={status.state} />
          </View>
          <Card style={{ padding: space.lg, gap: 10 }}>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.field, overflow: 'hidden' }}>
              <GrowBar pct={Math.min(100, Math.max(0, paidPct))} color={colors.success} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ gap: 2 }}>
                <Text variant="footnote">Paid</Text>
                <Text variant="mono">{plain(paid)}</Text>
              </View>
              <View style={{ gap: 2, alignItems: 'flex-end' }}>
                <Text variant="footnote">Still owed</Text>
                <Text variant="mono" style={{ color: owedUnits > 0n ? colors.danger : colors.secondary }}>
                  {plain(status.owed)}
                </Text>
              </View>
            </View>
          </Card>
        </View>
      ) : null}
      {s.notes ? (
        <Text variant="caption" style={{ paddingHorizontal: space.xs }}>
          Note: {s.notes}
        </Text>
      ) : null}
    </Screen>
  );
}
