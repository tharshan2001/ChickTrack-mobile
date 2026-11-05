import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { branches, products } from '@/api/resources';
import type { Branch, Distribution } from '@/api/types';
import { EditLoader, useIdempotencyKey } from '@/components/form';
import { Screen } from '@/components/screen';
import { toast } from '@/components/toast';
import { Text } from '@/components/text';
import { Badge, Card, IconButton, Separator } from '@/components/ui';
import { useBranchBalance, useBranchSales, useBranchStock } from '@/features/branch-api';
import { useDispatch, useDistributions } from '@/features/distribution-api';
import { formatKgShort, sum, toUnits } from '@/lib/decimal';
import { BusinessDate, colomboToday, formatRupees, formatRupeesCompact, weekStart } from '@/lib/format';
import { colors, radius, space } from '@/theme/tokens';
import { AppearList, CountText, showSaved, useFirstBatch } from '@/components/motion';

export default function BranchHomeRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <EditLoader title="Branch" query={branches.useOne(id)}>
      {(b) => <BranchHome b={b} />}
    </EditLoader>
  );
}

function ActionLink({
  title,
  onPress,
  primary,
  accent,
}: {
  title: string;
  onPress: () => void;
  primary?: boolean;
  accent?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        height: primary ? 50 : 40,
        paddingHorizontal: accent ? 14 : 18,
        borderRadius: radius.field,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: primary ? (pressed ? colors.accentPressed : colors.accent) : colors.field,
      })}>
      <Text variant="bodyMedium" style={{ color: primary ? colors.surface : accent ? colors.accent : colors.ink, letterSpacing: 0.5 }}>
        {title}
      </Text>
    </Pressable>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <Card style={{ padding: space.lg, gap: 14 }}>{children}</Card>;
}

/** A draft dispatch waiting at head office: review it, or send it from here. */
function DraftCard({ d, productName }: { d: Distribution; productName: (id: string) => string }) {
  const send = useDispatch(d.id);
  const idem = useIdempotencyKey();
  return (
    <Section>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="headline">Ready to send</Text>
        <Badge label="Draft" tone="neutral" />
      </View>
      <View style={{ gap: 2 }}>
        <Text variant="numBig">{formatKgShort(d.totalWeightKg)}</Text>
        <Text variant="caption">
          {[...new Set(d.items.map((i) => productName(i.chickenTypeId)))].join(', ')} ·{' '}
          <Text variant="monoSmall" style={{ color: colors.secondary }}>
            {d.reference}
          </Text>{' '}
          · held in warehouse
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <ActionLink title="Review" onPress={() => router.push({ pathname: '/dispatches/[id]', params: { id: d.id } })} />
        </View>
        <View style={{ flex: 2 }}>
          <ActionLink title={send.isPending ? 'Sending…' : 'Send now'} primary onPress={() => !send.isPending && send.mutate(idem.key, {
                onSuccess: (x) =>
                  showSaved('Sent to branch', {
                    detail: `${x.reference} · ${formatKgShort(x.totalWeightKg)}`,
                    action: { label: 'View', onPress: () => router.push({ pathname: '/dispatches/[id]', params: { id: x.id } }) },
                  }),
                onError: (e) => {
                  idem.onError(e);
                  toast.error("Couldn't send it", { detail: errorMessage(e) });
                },
              })} />
        </View>
      </View>
    </Section>
  );
}

function BranchHome({ b }: { b: Branch }) {
  const today = colomboToday();
  const productList = products.useList('');
  const productName = (id: string) => productList.data?.content.find((p) => p.id === id)?.name ?? 'Product';
  const arriving = useDistributions('', '', 'DISPATCHED', b.id);
  const drafts = useDistributions('', '', 'DRAFT', b.id);
  const firstLoad = useFirstBatch(drafts.isSuccess && arriving.isSuccess);
  const sales = useBranchSales(b.id, today, today);
  const week = useBranchSales(b.id, weekStart(today), today);
  const weekTotal = sum((week.data ?? []).map((s) => s.totalSales), 2);
  const stock = useBranchStock(b.id);
  const owes = useBranchBalance(b.id);

  const todaySale = sales.data?.[0];
  const stockRows = (stock.data ?? []).filter((s) => toUnits(s.availableWeightKg, 3) > 0n);

  return (
    <Screen
      title={b.name}
      subtitle={BusinessDate.today()}
      left={<IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />}
      bodyGap={12}
      right={
        <IconButton
          icon="edit-2"
          label="Edit branch"
          onPress={() => router.push({ pathname: '/branches/[id]/edit', params: { id: b.id } })}
        />
      }>
      {!b.active ? <Badge label="Inactive · no new dispatches or sales" tone="neutral" /> : null}

      <AppearList still={firstLoad}>
        {(drafts.data?.content ?? []).map((d) => (
        <DraftCard key={d.id} d={d} productName={productName} />
      ))}
      </AppearList>

      <AppearList still={firstLoad}>
        {(arriving.data?.content ?? []).map((d) => (
        <Section key={d.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="headline">Arriving today</Text>
            <Badge label="Dispatched" tone="warning" />
          </View>
          <View style={{ gap: 2 }}>
            <Text variant="numBig">{formatKgShort(d.totalWeightKg)}</Text>
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
      </AppearList>

      <Card>
        <View style={{ padding: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="headline">Today&apos;s sales</Text>
            {sales.isPending ? (
              <ActivityIndicator color={colors.secondary} />
            ) : todaySale ? (
              <Text variant="caption">{formatRupees(todaySale.totalSales)}</Text>
            ) : (
              <Text variant="caption">Not entered yet</Text>
            )}
          </View>
          {b.active ? (
            <ActionLink
              title={todaySale ? 'Edit' : 'Enter'}
              onPress={() => router.push({ pathname: '/branches/[id]/sales', params: { id: b.id } })}
            />
          ) : null}
        </View>
        <Separator />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/branches/[id]/all-sales', params: { id: b.id } })}
          style={({ pressed }) => ({
            minHeight: 52,
            paddingLeft: space.lg,
            paddingRight: space.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            backgroundColor: pressed ? colors.field : 'transparent',
            borderBottomLeftRadius: radius.card,
            borderBottomRightRadius: radius.card,
          })}>
          <Text variant="bodyMedium" style={{ flex: 1, color: colors.accent }}>
            See all sales
          </Text>
          {week.data ? (
            <Text variant="caption">
              This week{' '}
              <Text variant="monoSmall" style={{ color: colors.secondary }}>
                {formatRupeesCompact(weekTotal)}
              </Text>
            </Text>
          ) : null}
          <Feather name="chevron-right" size={16} color={colors.secondary} />
        </Pressable>
      </Card>

      <Card style={{ padding: space.lg, gap: space.md }}>
        <Text variant="headline">Stock in branch</Text>
        {stock.isPending ? <ActivityIndicator color={colors.secondary} /> : null}
        {stock.isSuccess && stockRows.length === 0 ? (
          <Text variant="caption">Nothing in the branch right now.</Text>
        ) : null}
        {stockRows.map((s, i) => (
          <Fragment key={s.chickenTypeId}>
            {i > 0 ? <Separator inset={0} /> : null}
            <View
              style={{
                minHeight: 24,
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

      <Card style={{ padding: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Owes head office ${owes.data ? formatRupees(owes.data) : ''}, see statement`}
          hitSlop={8}
          onPress={() => router.push({ pathname: '/branches/[id]/money', params: { id: b.id } })}
          style={({ pressed }) => ({ flex: 1, gap: 2, opacity: pressed ? 0.6 : 1 })}>
          <Text variant="caption">Owes head office ›</Text>
          <CountText variant="numMoney" value={owes.data} format={formatRupees} />
        </Pressable>
        <ActionLink
          title="Record payment"
          accent
          onPress={() => router.push({ pathname: '/payments/new', params: { branchId: b.id } })}
        />
      </Card>
    </Screen>
  );
}
