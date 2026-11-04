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
import { formatKg, formatKgWhole, sum, toUnits } from '@/lib/decimal';
import { BusinessDate, colomboToday, formatRupees } from '@/lib/format';
import { colors, space } from '@/theme/tokens';

/** Home refreshes on its own every minute while it is open. */
const LIVE = 60_000;

function greeting() {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Colombo' }).format(new Date()));
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

function QuickAction({ icon, label, href }: { icon: keyof typeof Feather.glyphMap; label: string; href: Href }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push(href)}
      style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: 6, opacity: pressed ? 0.6 : 1 })}>
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          backgroundColor: colors.tint,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Feather name={icon} size={22} color={colors.accentPressed} />
      </View>
      <Text variant="bodyMedium" style={{ fontSize: 13 }}>
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

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card style={{ flexBasis: '47%', flexGrow: 1, padding: space.lg, gap: 4 }}>
      <Text variant="caption">{label}</Text>
      <Text variant="mono" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 18 }}>
        {value}
      </Text>
      {note ? (
        <Text variant="caption" style={{ fontSize: 12 }} numberOfLines={1}>
          {note}
        </Text>
      ) : null}
    </Card>
  );
}

const kgStrong = (v: string) => (
  <Text variant="mono" style={{ fontSize: 13, color: colors.ink }}>
    {formatKg(v)}
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
    <Screen title={firstName ? `${greeting()}, ${firstName}` : greeting()} subtitle={BusinessDate.today()}>
      <View style={{ flexDirection: 'row', paddingVertical: space.xs }}>
        <QuickAction icon="plus-circle" label="Buy" href="/purchases/new" />
        <QuickAction icon="truck" label="Send" href="/dispatches/new" />
        <QuickAction
          icon="shopping-bag"
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
            <Tile label="Sales" value={formatRupees(d.totalSales, 0)} note={`branch profit ${formatRupees(d.branchProfit, 0)}`} />
            <Tile label="Our margin" value={formatRupees(d.ourMargin, 0)} note={`on ${formatKgWhole(d.distributionWeightKg)} sent`} />
            <Tile
              label="Branches owe"
              value={owedTotal ? formatRupees(owedTotal, 0) : '…'}
              note={`${formatRupees(d.branchOutstanding, 0)} from today`}
            />
            <Tile label="In warehouse" value={formatKgWhole(d.stockWeightKg)} note={formatRupees(d.stockValue, 0)} />
            <Tile label="Bought" value={formatKgWhole(d.procurementWeightKg)} note={formatRupees(d.procurementValue, 0)} />
            <Tile
              label="Shrinkage"
              value={formatKg(d.shrinkageWeightKg)}
              note={toUnits(d.shrinkageWeightKg, 3) > 0n ? 'damage, loss, short deliveries' : 'none today'}
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
