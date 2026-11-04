import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { branches, products } from '@/api/resources';
import type { Branch } from '@/api/types';
import { EditLoader } from '@/components/form';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Badge, Card, IconButton, Separator } from '@/components/ui';
import { useBranchBalance, useBranchSales, useBranchStock } from '@/features/branch-api';
import { useDistributions } from '@/features/distribution-api';
import { formatKgShort, toUnits } from '@/lib/decimal';
import { BusinessDate, colomboToday, formatRupees } from '@/lib/format';
import { colors, radius, space } from '@/theme/tokens';

export default function BranchHomeRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <EditLoader title="Branch" query={branches.useOne(id)}>
      {(b) => <BranchHome b={b} />}
    </EditLoader>
  );
}

function ActionLink({ title, onPress, primary }: { title: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        height: 44,
        borderRadius: radius.field,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: primary ? (pressed ? colors.accentPressed : colors.accent) : colors.field,
      })}>
      <Text variant="bodyMedium" style={{ color: primary ? colors.surface : colors.accent, letterSpacing: 0.5 }}>
        {title}
      </Text>
    </Pressable>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <Card style={{ padding: space.lg, gap: space.md }}>{children}</Card>;
}

function BranchHome({ b }: { b: Branch }) {
  const today = colomboToday();
  const productList = products.useList('');
  const productName = (id: string) => productList.data?.content.find((p) => p.id === id)?.name ?? 'Product';
  const arriving = useDistributions('', '', 'DISPATCHED', b.id);
  const sales = useBranchSales(b.id, today, today);
  const stock = useBranchStock(b.id);
  const owes = useBranchBalance(b.id);

  const todaySale = sales.data?.[0];
  const stockRows = (stock.data ?? []).filter((s) => toUnits(s.availableWeightKg, 3) > 0n);

  return (
    <Screen
      title={b.name}
      subtitle={BusinessDate.today()}
      left={<IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />}
      right={
        <IconButton
          icon="edit-2"
          label="Edit branch"
          onPress={() => router.push({ pathname: '/branches/[id]/edit', params: { id: b.id } })}
        />
      }>
      {!b.active ? <Badge label="Inactive · no new dispatches or sales" tone="neutral" /> : null}

      {(arriving.data?.content ?? []).map((d) => (
        <Section key={d.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="headline">
              Arriving
            </Text>
            <Badge label="Dispatched" tone="warning" />
          </View>
          <View style={{ gap: 2 }}>
            <Text variant="numTitle">{formatKgShort(d.totalWeightKg)}</Text>
            <Text variant="caption">
              {[...new Set(d.items.map((i) => productName(i.chickenTypeId)))].join(', ')} ·{' '}
              <Text variant="monoSmall" style={{ color: colors.secondary }}>
                {d.reference}
              </Text>
            </Text>
          </View>
          <ActionLink
            title="Confirm what arrived"
            primary
            onPress={() => router.push({ pathname: '/dispatches/[id]/receive', params: { id: d.id } })}
          />
        </Section>
      ))}

      <Section>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="headline">
            Today&apos;s sales
          </Text>
          {sales.isPending ? (
            <ActivityIndicator color={colors.secondary} />
          ) : todaySale ? (
            <Text variant="mono">{formatRupees(todaySale.totalSales)}</Text>
          ) : (
            <Text variant="caption">Not entered yet</Text>
          )}
        </View>
        {b.active ? (
          <ActionLink
            title={todaySale ? 'Edit today’s sales' : 'Enter'}
            onPress={() => router.push({ pathname: '/branches/[id]/sales', params: { id: b.id } })}
          />
        ) : null}
      </Section>

      <Card>
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.sm }}>
          <Text variant="headline">
            Stock in branch
          </Text>
        </View>
        {stock.isPending ? <ActivityIndicator color={colors.secondary} style={{ padding: space.lg }} /> : null}
        {stock.isSuccess && stockRows.length === 0 ? (
          <Text variant="caption" style={{ paddingHorizontal: space.lg, paddingBottom: space.lg }}>
            Nothing in the branch right now.
          </Text>
        ) : null}
        {stockRows.map((s, i) => (
          <Fragment key={s.chickenTypeId}>
            {i > 0 ? <Separator /> : null}
            <View
              style={{
                minHeight: 48,
                paddingHorizontal: space.lg,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <Text>{productName(s.chickenTypeId)}</Text>
              <Text variant="mono">{formatKgShort(s.availableWeightKg)}</Text>
            </View>
          </Fragment>
        ))}
      </Card>

      <Section>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="headline">
            Owes head office
          </Text>
          <Text variant="mono">
            {owes.data ? formatRupees(owes.data) : '…'}
          </Text>
        </View>
        <ActionLink
          title="Record payment"
          onPress={() => router.push({ pathname: '/payments/new', params: { branchId: b.id } })}
        />
      </Section>
    </Screen>
  );
}
