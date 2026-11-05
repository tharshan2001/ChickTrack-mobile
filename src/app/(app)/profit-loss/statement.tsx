import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { branches } from '@/api/resources';
import { CountText } from '@/components/motion';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Card, ErrorBanner, IconButton } from '@/components/ui';
import { amount, negate, netColor } from '@/features/pl-ui';
import { periodLabel, useProfitLoss, type PLParams } from '@/features/profit-loss-api';
import { trimZeros } from '@/lib/decimal';
import { colors, fonts, space } from '@/theme/tokens';

function Head({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md }}>
      <Text variant="bodyMedium" style={{ fontFamily: fonts.bodySemiBold, flexShrink: 1 }}>
        {label}
      </Text>
      <Text variant="mono" style={{ color: color ?? colors.ink }}>
        {amount(value)}
      </Text>
    </View>
  );
}

function Sub({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ minHeight: 30, paddingLeft: space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md }}>
      <Text variant="caption" style={{ flexShrink: 1 }}>
        {label}
      </Text>
      <Text variant="monoSmall" style={{ color: colors.secondary }}>
        {amount(value)}
      </Text>
    </View>
  );
}

export default function Statement() {
  const params = useLocalSearchParams<Record<string, string>>();
  const pl = useProfitLoss(params as unknown as PLParams);
  const branchList = branches.useList('');
  const branchName = params.branchId ? branchList.data?.content.find((b) => b.id === params.branchId)?.name : 'all branches';
  const s = pl.data?.summary;

  return (
    <Screen
      title="Statement"
      subtitle={pl.data ? `${periodLabel(pl.data)} · ${branchName ?? ''}` : undefined}
      left={<IconButton icon="chevron-left" label="Back to profit and loss" onPress={() => router.back()} />}
      bodyGap={12}
      bodyPaddingTop={12}>
      {pl.isError ? <ErrorBanner message={errorMessage(pl.error)} onRetry={pl.refetch} /> : null}
      {pl.isPending ? <ActivityIndicator color={colors.accent} /> : null}
      {s ? (
        <>
          <Card style={{ paddingHorizontal: space.lg, paddingVertical: space.xs }}>
            <Head label="Our margin on dispatches" value={s.headOffice.margin} />
            <Sub label="Charged to branches" value={s.headOffice.transferRevenue} />
            <Sub label="Our cost of the stock" value={negate(s.headOffice.costOfGoods)} />
            <Sub label="Distribution expenses" value={negate(s.headOffice.distributionExpenses)} />
          </Card>
          <Card style={{ paddingHorizontal: space.lg, paddingVertical: space.xs }}>
            <Head label="Branch profit" value={s.branches.profit} />
            <Sub label="Branch sales" value={s.branches.sales} />
            <Sub label="What that stock cost them" value={negate(s.branches.costOfSales)} />
          </Card>
          <Card style={{ paddingHorizontal: space.lg, paddingVertical: space.xs }}>
            <Head label={`Stock losses · ${trimZeros(s.stockLosses.weightKg)} kg`} value={negate(s.stockLosses.value)} color={colors.warning} />
            <Sub label="In the warehouse (at our cost)" value={negate(s.stockLosses.warehouseValue)} />
            <Sub label="On the way to branches" value={negate(s.stockLosses.transitValue)} />
          </Card>
          <Card style={{ paddingHorizontal: space.lg, paddingVertical: space.xs }}>
            <Head label="Operating expenses" value={negate(s.operatingExpenses.total)} color={colors.danger} />
            {s.operatingExpenses.byCategory.length === 0 ? <Sub label="None recorded" value="0.00" /> : null}
            {s.operatingExpenses.byCategory.map((c) => (
              <Sub key={c.categoryId} label={c.categoryName} value={negate(c.amount)} />
            ))}
          </Card>
          <View
            style={{
              borderRadius: 10,
              backgroundColor: s.netProfit.startsWith('-') ? colors.dangerBg : colors.successBg,
              borderWidth: 1,
              borderColor: s.netProfit.startsWith('-') ? colors.dangerBorder : colors.successBorder,
              paddingHorizontal: space.lg,
              minHeight: 56,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <View>
              <Text variant="bodyMedium" style={{ color: netColor(s.netProfit), fontFamily: fonts.bodySemiBold }}>
                Net profit
              </Text>
              {s.netMarginPercent ? (
                <Text variant="footnote" style={{ color: netColor(s.netProfit) }}>
                  {trimZeros(s.netMarginPercent)}% of branch sales
                </Text>
              ) : null}
            </View>
            <CountText variant="num" style={{ color: netColor(s.netProfit) }} value={s.netProfit} format={amount} />
          </View>
          <Text variant="caption" style={{ paddingHorizontal: space.xs, lineHeight: 19 }}>
            Our margin counts when stock is dispatched, so stock a branch still holds already carries it. Purchase commission
            and costs are inside our cost of the stock.
          </Text>
        </>
      ) : null}
    </Screen>
  );
}
