import Feather from '@expo/vector-icons/Feather';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/client';
import type { StockBatch } from '@/api/types';
import { Segmented } from '@/components/pickers';
import { Text } from '@/components/text';
import { Badge, Card, ErrorBanner } from '@/components/ui';
import { useDistributions } from '@/features/distribution-api';
import { useOpenBatches } from '@/features/stock-api';
import { formatKg, formatKgWhole, sum, toUnits } from '@/lib/decimal';
import { formatRupees } from '@/lib/format';
import { colors, radius, space } from '@/theme/tokens';

const W = 3; // weight scale

function receivedLabel(b: StockBatch) {
  if (b.ageDays === 0) return 'Today';
  if (b.ageDays === 1) return 'Yesterday';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Colombo' }).format(
    new Date(b.receivedAt),
  );
}

/** Percent of the batch's received weight, for the bar. */
function pct(part: string, of: string) {
  const total = toUnits(of, W);
  if (total === 0n) return 0;
  return Number((toUnits(part, W) * 1000n) / total) / 10;
}

function BatchCard({ b }: { b: StockBatch }) {
  const held = toUnits(b.reservedWeightKg, W) > 0n;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${b.chickenTypeName}, ${formatKg(b.availableWeightKg)} free`}
      onPress={() => router.push({ pathname: '/stock/[id]', params: { id: b.id } })}>
      {({ pressed }) => (
        <Card style={{ padding: space.lg, gap: space.md, opacity: pressed ? 0.8 : 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="bodyMedium" style={{ fontSize: 16 }}>
              {b.chickenTypeName}
            </Text>
            {held ? (
              <Badge label={`${formatKg(b.reservedWeightKg)} held`} tone="warning" />
            ) : (
              <Text variant="caption">{receivedLabel(b)}</Text>
            )}
          </View>
          <View
            style={{ height: 6, borderRadius: 3, backgroundColor: colors.field, flexDirection: 'row', overflow: 'hidden' }}>
            <View style={{ width: `${pct(b.availableWeightKg, b.receivedWeightKg)}%`, backgroundColor: colors.ink }} />
            <View style={{ width: `${pct(b.reservedWeightKg, b.receivedWeightKg)}%`, backgroundColor: colors.warningBorder }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
            <Text variant="caption" style={{ flex: 1 }} numberOfLines={1}>
              <Text variant="mono" style={{ fontSize: 13 }}>
                {formatKg(b.availableWeightKg)}
              </Text>{' '}
              free of {formatKg(b.receivedWeightKg).replace(' kg', '')}
              {held ? ` · ${receivedLabel(b)}` : ''}
            </Text>
            <Text variant="mono" style={{ fontSize: 13, color: colors.secondary }}>
              {formatRupees(b.landedCostPerKg)}/kg
            </Text>
          </View>
        </Card>
      )}
    </Pressable>
  );
}

function Stat({ label, value, tone, flex = 1 }: { label: string; value: string; tone?: string; flex?: number }) {
  return (
    <View style={{ flex, gap: 2 }}>
      <Text variant="caption">{label}</Text>
      <Text variant="mono" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 18, color: tone ?? colors.ink }}>
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
  icon: keyof typeof Feather.glyphMap;
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
        height: 44,
        borderRadius: radius.field,
        backgroundColor: primary ? (pressed ? colors.accentPressed : colors.accent) : colors.field,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.sm,
        opacity: disabled ? 0.45 : 1,
      })}>
      <Feather name={icon} size={18} color={fg} />
      <Text variant="bodyMedium" style={{ color: fg, letterSpacing: 0.5 }}>
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
  const heldByDrafts = sum((drafts.data?.content ?? []).map((d) => d.totalWeightKg), W);
  const [filter, setFilter] = useState('all');
  const batches = query.data ?? [];

  const productTabs = [...new Map(batches.map((b) => [b.chickenTypeId, b.chickenTypeName])).entries()];
  const shown = filter === 'all' ? batches : batches.filter((b) => b.chickenTypeId === filter);

  const onHand = sum(
    shown.map((b) => b.remainingWeightKg),
    W,
  );
  const held = sum(
    shown.map((b) => b.reservedWeightKg),
    W,
  );
  const value = sum(
    shown.map((b) => b.remainingValue),
    2,
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl }}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void qc.refetchQueries({ type: 'active' })} tintColor={colors.accent} />}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="largeTitle" accessibilityRole="header">
            Warehouse stock
          </Text>
          <Pressable
            accessibilityRole="link"
            hitSlop={8}
            onPress={() => router.push('/purchases')}
            style={{ height: 44, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text variant="bodyMedium" style={{ color: colors.accent }}>
              Purchases
            </Text>
            <Feather name="chevron-right" size={16} color={colors.accent} />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <ActionButton icon="plus" title="Buy stock" primary onPress={() => router.push('/purchases/new')} />
          <ActionButton icon="truck" title="Send to branch" onPress={() => router.push('/dispatches/new')} />
        </View>

        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Stat label="On hand" value={formatKgWhole(onHand)} />
          <Stat label="Held" value={formatKgWhole(held)} tone={toUnits(held, W) > 0n ? colors.warning : undefined} />
          <Stat label="Value" value={formatRupees(value, 0)} flex={1.5} />
        </View>

        {productTabs.length > 1 ? (
          <Segmented
            label="Chicken type"
            value={filter}
            onChange={setFilter}
            options={[{ value: 'all', label: 'All' }, ...productTabs.map(([id, name]) => ({ value: id, label: name }))]}
          />
        ) : null}

        {query.isError ? <ErrorBanner message={errorMessage(query.error)} onRetry={query.refetch} /> : null}
        {query.isPending ? <ActivityIndicator color={colors.accent} /> : null}

        {query.isSuccess && shown.length === 0 ? (
          <Card style={{ padding: space.xl, alignItems: 'center', gap: space.sm }}>
            <Text variant="bodyMedium">No stock in the warehouse</Text>
            <Text variant="caption" style={{ textAlign: 'center' }}>
              Record a purchase with Buy stock and it shows up here.
            </Text>
          </Card>
        ) : null}

        {draftCount + wayCount > 0 ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/dispatches')}>
            {({ pressed }) => (
              <Card style={{ padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md, opacity: pressed ? 0.8 : 1 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyMedium">Open dispatches</Text>
                  <Text variant="caption">
                    {[
                      draftCount ? `${draftCount} ${draftCount === 1 ? 'draft' : 'drafts'} holding ${formatKg(heldByDrafts)}` : null,
                      wayCount ? `${wayCount} on the way` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.secondary} />
              </Card>
            )}
          </Pressable>
        ) : (
          <Pressable accessibilityRole="link" onPress={() => router.push('/dispatches')} hitSlop={8}>
            <Text variant="bodyMedium" style={{ color: colors.accent }}>
              All dispatches ›
            </Text>
          </Pressable>
        )}

        {shown.length ? <Text variant="caption">Oldest first · issued in this order</Text> : null}
        {shown.map((b) => (
          <BatchCard key={b.id} b={b} />
        ))}

        {shown.length ? (
          <View style={{ flexDirection: 'row', gap: space.lg }}>
            <Legend color={colors.ink} text="Free" />
            <Legend color={colors.warningBorder} text="Held for draft" />
          </View>
        ) : null}
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
