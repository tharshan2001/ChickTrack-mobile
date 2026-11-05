import { router, useLocalSearchParams } from 'expo-router';
import { Fragment } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { branches } from '@/api/resources';
import type { Branch } from '@/api/types';
import { EditLoader } from '@/components/form';
import { ChevronRightIcon } from '@/components/icons';
import { AppearList, useCountUp, useFirstBatch } from '@/components/motion';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Badge, Button, Card, IconButton, Separator } from '@/components/ui';
import { useBranchBalance } from '@/features/branch-api';
import { useOpenSales, useSettlements } from '@/features/money-api';
import { dayLabel, PaymentRow, TitleWithLink, unpaidLine } from '@/features/payment-ui';
import { toUnits } from '@/lib/decimal';
import { formatRupees } from '@/lib/format';
import { colors, space } from '@/theme/tokens';

export default function BranchMoneyRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditLoader title="Branch money" query={branches.useOne(id)}>{(b) => <BranchMoney b={b} />}</EditLoader>;
}

/** What one branch owes: the total, the sales still unpaid, and its payments. */
function BranchMoney({ b }: { b: Branch }) {
  const owes = useBranchBalance(b.id);
  const open = useOpenSales(b.id);
  const payments = useSettlements(b.id);
  const sales = [...(open.data ?? [])].sort((x, y) => x.saleDate.localeCompare(y.saleDate));
  const owed = useCountUp(owes.data, 2);
  const firstLoad = useFirstBatch(open.isSuccess && payments.isSuccess);

  return (
    <Screen
      title={owed ? formatRupees(owed) : '…'}
      titleVariant="numDisplay"
      subtitle={`${b.name} owes`}
      subtitleAbove
      left={<IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />}
      headerExtra={unpaidLine(open.data) ? <Text variant="caption">{unpaidLine(open.data)}</Text> : undefined}
      bodyGap={24}
      footer={
        b.active ? (
          <Button title="Record payment" onPress={() => router.push({ pathname: '/payments/new', params: { branchId: b.id } })} />
        ) : undefined
      }>
      <View style={{ gap: space.sm }}>
        <TitleWithLink title="Unpaid sales" />
        {open.isPending ? <ActivityIndicator color={colors.accent} /> : null}
        {open.isSuccess && sales.length === 0 ? (
          <Card style={{ padding: space.xl, alignItems: 'center' }}>
            <Text variant="caption">Nothing owed. Every sale is paid for.</Text>
          </Card>
        ) : null}
        {sales.length ? (
          <Card>
            <AppearList still={firstLoad}>
              {sales.map((s, i) => {
              const part = toUnits(s.outstandingAmount, 2) < toUnits(s.transferValue, 2);
              return (
                <Fragment key={s.branchSaleId}>
                  {i > 0 ? <Separator /> : null}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: '/sales/[id]', params: { id: s.branchSaleId } })}
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
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text variant="bodyMedium">{dayLabel(s.saleDate)}</Text>
                      <Text variant="caption" numberOfLines={1}>
                        <Text variant="monoSmall" style={{ color: colors.secondary }}>
                          {s.reference}
                        </Text>{' '}
                        · owed of {formatRupees(s.transferValue)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text variant="mono">{formatRupees(s.outstandingAmount)}</Text>
                      <Badge label={part ? 'Part paid' : 'Unpaid'} tone={part ? 'warning' : 'danger'} />
                    </View>
                    <ChevronRightIcon size={16} color="#AEAEB2" />
                  </Pressable>
                </Fragment>
              );
            })}
            </AppearList>
          </Card>
        ) : null}
      </View>

      <View style={{ gap: space.sm }}>
        <TitleWithLink
          title="Payments"
          link={payments.data?.length ? 'See all' : undefined}
          onPress={() => router.push({ pathname: '/payments', params: { branchId: b.id } })}
        />
        {payments.isPending ? <ActivityIndicator color={colors.accent} /> : null}
        {payments.isSuccess && payments.data.length === 0 ? (
          <Card style={{ padding: space.xl, alignItems: 'center' }}>
            <Text variant="caption">No payments from {b.name} yet.</Text>
          </Card>
        ) : null}
        {payments.data?.length ? (
          <Card>
            <AppearList still={firstLoad}>
              {payments.data.slice(0, 5).map((p, i) => (
              <Fragment key={p.id}>
                {i > 0 ? <Separator /> : null}
                <PaymentRow p={p} />
              </Fragment>
            ))}
            </AppearList>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}
