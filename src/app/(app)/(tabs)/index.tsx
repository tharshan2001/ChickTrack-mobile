import { useQueries, useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { Fragment, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { api, errorMessage, type Page } from '@/api/client';
import { branches, products } from '@/api/resources';
import type { BranchSale, Dashboard } from '@/api/types';
import { useAuth } from '@/auth/auth-context';
import { BarsIcon, CardIcon, CartIcon, ChevronRightIcon, TruckIcon } from '@/components/icons';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Card, ErrorBanner, SectionHeader, Separator } from '@/components/ui';
import { useDistributions } from '@/features/distribution-api';
import { Appear, CountText, haptic, PressScale, useFirstBatch } from '@/components/motion';
import { WelcomeBanner } from '@/features/welcome-banner';
import { formatKgShort, formatKgWhole, sum, toUnits } from '@/lib/decimal';
import { colomboToday, formatRupees } from '@/lib/format';
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
  icon: ReactNode;
  label: string;
  href: Href;
  primary?: boolean;
}) {
  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic.tap();
        router.push(href);
      }}
      scaleTo={0.92}
      style={{ flex: 1, alignItems: 'center', gap: 4 }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: primary ? colors.accent : colors.field,
          alignItems: 'center',
          justifyContent: 'center',
          ...(primary ? { boxShadow: '0 4px 16px rgba(162, 8, 12, 0.22)' } : null),
        }}>
        {icon}
      </View>
      <Text variant="caption" style={{ fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16, color: colors.ink }}>
        {label}
      </Text>
    </PressScale>
  );
}

function Task({ title, detail, onPress, tone }: { title: string; detail: ReactNode; onPress: () => void; tone: 'warning' | 'neutral' }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 64,
        paddingHorizontal: space.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        backgroundColor: pressed ? colors.field : 'transparent',
      })}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: tone === 'warning' ? colors.warningDot : colors.secondary,
        }}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyMedium">{title}</Text>
        <Text variant="caption" numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <ChevronRightIcon size={18} />
    </Pressable>
  );
}

/**
 * Label and figure, nothing else. The mockups colour the two figures that carry
 * a judgement — margin earned, weight lost — and leave the rest ink, so the pair
 * can be read without looking at the labels.
 */
function Tile({
  label,
  value,
  decimals,
  format,
  tone,
}: {
  label: string;
  value: string | null;
  decimals: number;
  format: (v: string) => string;
  tone?: string;
}) {
  return (
    <Card style={{ flexBasis: '47%', flexGrow: 1, paddingVertical: 14, paddingHorizontal: space.lg, gap: 4 }}>
      <Text variant="caption">{label}</Text>
      <CountText value={value} decimals={decimals} format={format} variant="numTile" numberOfLines={1} style={tone ? { color: tone } : undefined} />
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
        tone="neutral"
        title={`Dispatch ${branchName(d.branchId)} draft`}
        detail={<>{kgStrong(d.totalWeightKg)} held in stock</>}
        onPress={() => router.push({ pathname: '/dispatches/[id]', params: { id: d.id } })}
      />
    )),
    ...(missingSales.length
      ? [
          <Task
            key="sales"
            tone="neutral"
            title="Enter today's sales"
            detail={missingSales.map((b) => b.name).join(' · ')}
            onPress={() => router.push({ pathname: '/branches/[id]/sales', params: { id: missingSales[0]!.id } })}
          />,
        ]
      : []),
  ];

  // Tasks on screen when Home opens just appear; ones that come or go later animate.
  const firstTasks = useFirstBatch(arriving.isSuccess && drafts.isSuccess);
  const d = dashboard.data;
  const firstName = user?.fullName.split(' ')[0];

  return (
    <Screen title="Home" hideTitle bodyPaddingTop={12} bodyGap={space.xl}>
      <WelcomeBanner
        greeting={greeting()}
        name={firstName || undefined}
      />
      <View style={{ gap: space.sm }}>
        <SectionHeader title="Quick actions" size="small" />
        <Card style={{ flexDirection: 'row', gap: space.sm, paddingVertical: space.md, paddingHorizontal: space.sm }}>
          <QuickAction icon={<CartIcon size={20} color={colors.surface} strokeWidth={1.8} />} label="Buy" href="/purchases/new" primary />
          <QuickAction icon={<TruckIcon size={20} />} label="Send" href="/dispatches/new" />
          <QuickAction
            icon={<BarsIcon size={20} />}
            label="Sales"
            href={firstMissing ? { pathname: '/branches/[id]/sales', params: { id: firstMissing.id } } : '/branches'}
          />
          <QuickAction icon={<CardIcon size={20} />} label="Payment" href="/payments/new" />
        </Card>
      </View>

      {tasks.length ? (
        <View style={{ gap: space.md }}>
          <SectionHeader title="Needs you" />
          <Card>
            {tasks.map((t, i) => (
              <Appear key={t.key ?? i} still={firstTasks}>
                {i > 0 ? <Separator inset={36} /> : null}
                {t}
              </Appear>
            ))}
          </Card>
        </View>
      ) : null}

      <View style={{ gap: space.md }}>
        <SectionHeader title="Today" />
        {dashboard.isError ? <ErrorBanner message={errorMessage(dashboard.error)} onRetry={dashboard.refetch} /> : null}
        {dashboard.isPending ? <ActivityIndicator color={colors.accent} /> : null}
        {d ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
            <Tile label="Our margin" value={d.ourMargin} decimals={2} format={(v) => formatRupees(v, 0)} tone={colors.success} />
            <Tile label="Branches owe" value={owedTotal} decimals={2} format={(v) => formatRupees(v, 0)} />
            <Tile label="In warehouse" value={d.stockWeightKg} decimals={3} format={formatKgWhole} />
            <Tile
              label="Shrinkage"
              value={d.shrinkageWeightKg}
              decimals={3}
              format={formatKgShort}
              tone={toUnits(d.shrinkageWeightKg, 3) > 0n ? colors.warning : undefined}
            />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
