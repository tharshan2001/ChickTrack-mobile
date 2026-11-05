import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/client';
import { branches } from '@/api/resources';
import type { StockBatch } from '@/api/types';
import { ChevronRightIcon, PlusIcon, TruckIcon } from '@/components/icons';
import { PressScale } from '@/components/motion';
import { Text } from '@/components/text';
import { Badge, Card, ErrorBanner, SearchField, Separator } from '@/components/ui';
import { useDistributions } from '@/features/distribution-api';
import { useOpenBatches } from '@/features/stock-api';
import { formatKg, formatKgShort, formatKgWhole, sum, toUnits } from '@/lib/decimal';
import { formatRupees, formatRupeesCompact } from '@/lib/format';
import { colors, fonts, radius, space } from '@/theme/tokens';

const W = 3; // weight scale

function receivedLabel(b: StockBatch) {
  if (b.ageDays === 0) return 'Today';
  if (b.ageDays === 1) return 'Yesterday';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Colombo' }).format(
    new Date(b.receivedAt),
  );
}

/** Full received date for search, e.g. "2 Nov 2026". */
function searchDate(b: StockBatch) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Colombo' }).format(
    new Date(b.receivedAt),
  );
}

/** Percent of the batch's received weight, for the bar. */
function pct(part: string, of: string) {
  const total = toUnits(of, W);
  if (total === 0n) return 0;
  return Number((toUnits(part, W) * 1000n) / total) / 10;
}

function BatchCard({ b, heldFor }: { b: StockBatch; heldFor?: string }) {
  const held = toUnits(b.reservedWeightKg, W) > 0n;
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={`${b.chickenTypeName}, ${formatKg(b.availableWeightKg)} free`}
      onPress={() => router.push({ pathname: '/stock/[id]', params: { id: b.id } })}>
      
        <Card style={{ padding: space.lg, gap: space.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="headline">
              {b.chickenTypeName}
            </Text>
            {held ? (
              <Badge
                label={heldFor ? `${formatKgShort(b.reservedWeightKg)} held · ${heldFor}` : `${formatKgShort(b.reservedWeightKg)} held`}
                tone="warning"
              />
            ) : (
              <Text variant="caption">{receivedLabel(b)}</Text>
            )}
          </View>
          <View
            style={{ height: 6, borderRadius: 3, backgroundColor: colors.field, flexDirection: 'row', overflow: 'hidden' }}>
            <View style={{ width: `${pct(b.availableWeightKg, b.receivedWeightKg)}%`, backgroundColor: colors.ink }} />
            <View style={{ width: `${pct(b.reservedWeightKg, b.receivedWeightKg)}%`, backgroundColor: colors.warningDot }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
            <Text variant="caption" style={{ flex: 1 }} numberOfLines={1}>
              <Text variant="monoSmall">
                {formatKgShort(b.availableWeightKg)}
              </Text>{' '}
              free of {formatKgShort(b.receivedWeightKg).replace(' kg', '')}
              {held ? ` · ${receivedLabel(b)}` : ''}
            </Text>
            <Text variant="monoSmall" style={{ color: colors.secondary }}>
              {formatRupees(b.landedCostPerKg)}/kg
            </Text>
          </View>
        </Card>
      
    </PressScale>
  );
}

function Stat({ label, value, tone, first }: { label: string; value: string; tone?: string; first?: boolean }) {
  return (
    <View
      style={{
        flex: 1,
        gap: 2,
        paddingLeft: first ? space.lg : space.md,
        paddingRight: space.md,
        borderLeftWidth: first ? 0 : 1,
        borderLeftColor: colors.separator,
      }}>
      <Text variant="caption" style={{ fontSize: 12, lineHeight: 16 }}>
        {label}
      </Text>
      <Text variant="num" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 17, lineHeight: 22, color: tone ?? colors.ink }}>
        {value}
      </Text>
    </View>
  );
}

function ActionButton({
  icon,
  title,
  primary,
  onPress,
  disabled,
}: {
  icon: 'plus' | 'truck';
  title: string;
  primary?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const fg = primary ? colors.surface : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 44,
        paddingVertical: 6,
        paddingHorizontal: space.sm,
        borderRadius: radius.field,
        backgroundColor: primary ? (pressed ? colors.accentPressed : colors.accent) : colors.field,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.sm,
        opacity: disabled ? 0.45 : 1,
      })}>
      {icon === 'plus' ? <PlusIcon size={18} color={fg} /> : <TruckIcon size={18} color={fg} strokeWidth={1.8} />}
      <Text variant="bodyMedium" style={{ color: fg, letterSpacing: 0.5, flexShrink: 1, textAlign: 'center' }}>
        {title}
      </Text>
    </Pressable>
  );
}

export default function StockTab() {
  const qc = useQueryClient();
  const query = useOpenBatches();
  const drafts = useDistributions('', '', 'DRAFT');
  const onTheWay = useDistributions('', '', 'DISPATCHED');
  const draftCount = drafts.data?.totalElements ?? 0;
  const wayCount = onTheWay.data?.totalElements ?? 0;
  const [search, setSearch] = useState('');
  const batches = query.data ?? [];

  // Which branch each draft is holding stock for, so the badge can say who it is
  // for rather than only how much. Drafts are already loaded above.
  const branchList = branches.useList('', true);
  const heldFor = new Map<string, string>();
  for (const d of drafts.data?.content ?? []) {
    const name = branchList.data?.content.find((x) => x.id === d.branchId)?.name;
    if (name) for (const it of d.items) heldFor.set(it.stockBatchId, name);
  }

  // Search matches the chicken type or the received date ("today", "2 nov", "nov").
  const q = search.trim().toLowerCase();
  const shown = q
    ? batches.filter((b) =>
        [b.chickenTypeName, receivedLabel(b), searchDate(b)].some((t) => t.toLowerCase().includes(q)),
      )
    : batches;

  // The summary is the whole warehouse; search only narrows the list.
  const onHand = sum(
    batches.map((b) => b.remainingWeightKg),
    W,
  );
  const held = sum(
    batches.map((b) => b.reservedWeightKg),
    W,
  );
  const value = sum(
    batches.map((b) => b.remainingValue),
    2,
  );
  const dispatchLine = [
    draftCount ? `${draftCount} ${draftCount === 1 ? 'draft' : 'drafts'}` : null,
    wayCount ? `${wayCount} on the way` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void qc.refetchQueries({ type: 'active' })} tintColor={colors.accent} />}>
        <View style={{ gap: space.lg }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', columnGap: space.md }}>
            <Text variant="largeTitle" accessibilityRole="header" style={{ flexShrink: 1 }}>
              Stock
            </Text>
            <Pressable
              accessibilityRole="link"
              hitSlop={8}
              onPress={() => router.push('/purchases')}
              style={({ pressed }) => ({
                height: 32,
                paddingLeft: space.md,
                paddingRight: 10,
                borderRadius: 16,
                backgroundColor: colors.field,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 2,
                opacity: pressed ? 0.6 : 1,
              })}>
              <Text variant="caption" style={{ fontFamily: fonts.bodyMedium, color: colors.ink, letterSpacing: 0 }}>
                Purchases
              </Text>
              <ChevronRightIcon size={14} color={colors.secondary} />
            </Pressable>
          </View>

          <Card style={{ borderWidth: 1, borderColor: 'rgba(162, 8, 12, 0.25)' }}>
            <View style={{ flexDirection: 'row', paddingVertical: 14 }}>
              <Stat first label="On hand" value={formatKgWhole(onHand)} />
              <Stat label="Held" value={formatKgWhole(held)} tone={toUnits(held, W) > 0n ? colors.warning : undefined} />
              <Stat label="Value" value={formatRupeesCompact(value)} />
            </View>
            <Separator inset={space.lg} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={dispatchLine ? `Open dispatches, ${dispatchLine}` : 'All dispatches'}
              onPress={() => router.push('/dispatches')}
              style={({ pressed }) => ({
                minHeight: 44,
                paddingLeft: space.lg,
                paddingRight: space.md,
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.sm,
                opacity: pressed ? 0.6 : 1,
              })}>
              {dispatchLine ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warningDot }} /> : null}
              <Text variant="caption" style={{ flex: 1 }} numberOfLines={1}>
                <Text variant="caption" style={{ fontFamily: fonts.bodyMedium, color: colors.ink }}>
                  {dispatchLine ? 'Open dispatches' : 'All dispatches'}
                </Text>
                {dispatchLine ? ` · ${dispatchLine}` : ''}
              </Text>
              <ChevronRightIcon size={16} color="#AEAEB2" />
            </Pressable>
          </Card>

          <View style={{ flexDirection: 'row', gap: space.md }}>
            <ActionButton icon="plus" title="Buy stock" primary onPress={() => router.push('/purchases/new')} />
            <ActionButton icon="truck" title="Send to branch" onPress={() => router.push('/dispatches/new')} />
          </View>

          {batches.length ? (
            <SearchField
              placeholder="Search chicken type or date"
              accessibilityLabel="Search stock"
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
          ) : null}
        </View>

        <View style={{ gap: space.md, marginTop: space.md }}>
        {query.isError ? <ErrorBanner message={errorMessage(query.error)} onRetry={query.refetch} /> : null}
        {query.isPending ? <ActivityIndicator color={colors.accent} /> : null}

        {query.isSuccess && batches.length > 0 && shown.length === 0 ? (
          <Text variant="caption" style={{ textAlign: 'center', paddingVertical: space.lg }}>
            No stock matches “{search.trim()}”
          </Text>
        ) : null}

        {query.isSuccess && batches.length === 0 ? (
          <Card style={{ padding: space.xl, alignItems: 'center', gap: space.sm }}>
            <Text variant="bodyMedium">No stock in the warehouse</Text>
            <Text variant="caption" style={{ textAlign: 'center' }}>
              Record a purchase with Buy stock and it shows up here.
            </Text>
          </Card>
        ) : null}

        {shown.length ? <Text variant="caption">Oldest first · issued in this order</Text> : null}
        {shown.map((b) => (
          <BatchCard key={b.id} b={b} heldFor={heldFor.get(b.id)} />
        ))}

        {shown.length ? (
          <View style={{ flexDirection: 'row', gap: space.lg }}>
            <Legend color={colors.ink} text="Free" />
            <Legend color={colors.warningDot} text="Held for draft" />
          </View>
        ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text variant="caption">{text}</Text>
    </View>
  );
}
