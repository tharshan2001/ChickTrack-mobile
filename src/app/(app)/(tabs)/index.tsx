import Feather from '@expo/vector-icons/Feather';
import { useQueries, useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { Fragment, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { api, errorMessage, type Page } from '@/api/client';
import { branches, products } from '@/api/resources';
import type { BranchSale, Dashboard } from '@/api/types';
import { useAuth } from '@/auth/auth-context';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Card, ErrorBanner, SectionHeader, Separator } from '@/components/ui';
import { useDistributions } from '@/features/distribution-api';
import { formatKgShort, formatKgWhole, sum, toUnits } from '@/lib/decimal';
import { BusinessDate, colomboToday, formatRupeesCompact } from '@/lib/format';
import { colors, fonts, space } from '@/theme/tokens';

/** Home refreshes on its own every minute while it is open. */
const LIVE = 60_000;

function greeting() {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Colombo' }).format(new Date()));
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

/**
 * One action is primary and filled; the rest are neutral. Tinting all four made
 * the row decorative and left no first move for the eye to land on.
 */
function QuickAction({
  icon,
  label,
  href,
  primary,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  href: Href;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push(href)}
      style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: 6, opacity: pressed ? 0.6 : 1 })}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          backgroundColor: primary ? colors.accent : colors.field,
          alignItems: 'center',
          justifyContent: 'center',
          ...(primary ? { boxShadow: '0 4px 16px rgba(162, 8, 12, 0.22)' } : null),
        }}>
        <Feather name={icon} size={22} color={primary ? colors.surface : colors.ink} />
      </View>
      <Text variant="caption" style={{ fontFamily: fonts.bodyMedium, color: colors.ink }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Task({ title, detail, onPress, tone }: { title: string; detail: ReactNode; onPress: () => void; tone: 'warning' | 'accent' }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 60,
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        backgroundColor: pressed ? colors.field : 'transparent',
      })}>
      <View
        style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tone === 'warning' ? colors.warningBorder : colors.accent }}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyMedium">{title}</Text>
        <Text variant="caption" numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.secondary} />
    </Pressable>
  );
}

/**
 * Label and figure, nothing else. The mockups colour the two figures that carry
 * a judgement — margin earned, weight lost — and leave the rest ink, so the pair
 * can be read without looking at the labels.
 */
function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card style={{ flexBasis: '47%', flexGrow: 1, padding: space.lg, gap: 4 }}>
      <Text variant="caption">{label}</Text>
      <Text variant="num" numberOfLines={1} style={tone ? { color: tone } : undefined}>
        {value}
      </Text>
    </Card>
  );
}

const kgStrong = (v: string) => (
  <Text variant="monoSmall" style={{ color: colors.ink }}>
    {formatKgShort(v)}
  </Text>
);

export default function Home() {
  const { user } = useAuth();
  const today = colomboToday();
  const productList = products.useList('');
  const branchList = branches.useList('', true);
  const activeBranches = branchList.data?.content ?? [];
  const productName = (id: string) => productList.data?.content.find((p) => p.id === id)?.name ?? 'Product';
  const branchName = (id: string) => activeBranches.find((b) => b.id === id)?.name ?? 'Branch';

  const dashboard = useQuery({
    queryKey: ['dashboard', today],
    queryFn: () => api<Dashboard>('GET', '/api/v1/dashboard', { query: { from: today, to: today } }),
    refetchInterval: LIVE,
  });
  const arriving = useDistributions('', '', 'DISPATCHED');
  const drafts = useDistributions('', '', 'DRAFT');
  const salesToday = useQueries({
    queries: activeBranches.map((b) => ({
      queryKey: ['branch-sales', b.id, today, today],
      queryFn: () =>
        api<Page<BranchSale>>('GET', '/api/v1/branch-sales', { query: { branchId: b.id, from: today, to: today } }).then(
          (p) => p.content,
        ),
      refetchInterval: LIVE,
    })),
  });
  // Everything owed, not just today's (the dashboard figure covers the chosen days only).
  const allBranches = branches.useList('');
  const balances = useQueries({
    queries: (allBranches.data?.content ?? []).map((b) => ({
      queryKey: ['branch-balance', b.id],
      queryFn: () =>
        api<{ outstandingAmount: string }>('GET', `/api/v1/branches/${b.id}/balance`).then((r) => r.outstandingAmount),
      refetchInterval: LIVE,
    })),
  });
  const owedTotal = balances.every((q) => q.isSuccess) ? sum(balances.map((q) => q.data), 2) : null;
  const missingSales = activeBranches.filter((b, i) => salesToday[i]?.isSuccess && salesToday[i]!.data!.length === 0);
  const firstMissing = missingSales[0] ?? activeBranches[0];

  const tasks = [
    ...(arriving.data?.content ?? []).map((d) => (
      <Task
        key={d.id}
        tone="warning"
        title={`Confirm ${branchName(d.branchId)} delivery`}
        detail={
          <>
            {kgStrong(d.totalWeightKg)} {[...new Set(d.items.map((i) => productName(i.chickenTypeId)))].join(', ')} · dispatched
          </>
        }
        onPress={() => router.push({ pathname: '/dispatches/[id]/receive', params: { id: d.id } })}
      />
    )),
    ...(drafts.data?.content ?? []).map((d) => (
      <Task
        key={d.id}
        tone="warning"
        title={`Dispatch ${branchName(d.branchId)} draft`}
        detail={<>{kgStrong(d.totalWeightKg)} held in stock</>}
        onPress={() => router.push({ pathname: '/dispatches/[id]', params: { id: d.id } })}
      />
    )),
    ...(missingSales.length
      ? [
          <Task
            key="sales"
            tone="accent"
            title="Enter today's sales"
            detail={missingSales.map((b) => b.name).join(' · ')}
            onPress={() => router.push({ pathname: '/branches/[id]/sales', params: { id: missingSales[0]!.id } })}
          />,
        ]
      : []),
  ];

  const d = dashboard.data;
  const firstName = user?.fullName.split(' ')[0];

  return (
    <Screen title={firstName ? `${greeting()}, ${firstName}` : greeting()} subtitle={BusinessDate.today()} subtitleAbove>
      <View style={{ flexDirection: 'row', paddingVertical: space.xs }}>
        <QuickAction icon="shopping-cart" label="Buy" href="/purchases/new" primary />
        <QuickAction icon="truck" label="Send" href="/dispatches/new" />
        <QuickAction
          icon="bar-chart-2"
          label="Sales"
          href={firstMissing ? { pathname: '/branches/[id]/sales', params: { id: firstMissing.id } } : '/branches'}
        />
        <QuickAction icon="credit-card" label="Payment" href="/payments/new" />
      </View>

      {tasks.length ? (
        <View style={{ gap: space.sm }}>
          <SectionHeader title="Needs you" />
          <Card>
            {tasks.map((t, i) => (
              <Fragment key={i}>
                {i > 0 ? <Separator /> : null}
                {t}
              </Fragment>
            ))}
          </Card>
        </View>
      ) : null}

      <View style={{ gap: space.sm }}>
        <SectionHeader title="Today" />
        {dashboard.isError ? <ErrorBanner message={errorMessage(dashboard.error)} onRetry={dashboard.refetch} /> : null}
        {dashboard.isPending ? <ActivityIndicator color={colors.accent} /> : null}
        {d ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
            <Tile label="Our margin" value={formatRupeesCompact(d.ourMargin)} tone={colors.success} />
            <Tile label="Branches owe" value={owedTotal ? formatRupeesCompact(owedTotal) : '…'} />
            <Tile label="In warehouse" value={formatKgWhole(d.stockWeightKg)} />
            <Tile
              label="Shrinkage"
              value={formatKgShort(d.shrinkageWeightKg)}
              tone={toUnits(d.shrinkageWeightKg, 3) > 0n ? colors.warning : undefined}
            />
          </View>
        ) : null}
      </View>

      <Text variant="caption" style={{ textAlign: 'center' }}>
        Pull down to refresh · updates every minute
      </Text>
    </Screen>
  );
}
