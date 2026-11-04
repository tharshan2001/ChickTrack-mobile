import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { branches } from '@/api/resources';
import type { Distribution } from '@/api/types';
import { Segmented } from '@/components/pickers';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Badge, Card, ErrorBanner, IconButton, Notice, Separator } from '@/components/ui';
import { useDistributions } from '@/features/distribution-api';
import { formatKgShort } from '@/lib/decimal';
import { colomboToday, formatDayHeading, formatRupees, statusLabel, weekStart } from '@/lib/format';
import { colors, space } from '@/theme/tokens';

type View_ = 'open' | 'week' | 'month';

function badgeFor(d: Distribution) {
  if (d.status === 'DRAFT') return <Badge label={`Draft · ${formatKgShort(d.totalWeightKg)} held`} tone="warning" />;
  if (d.status === 'DISPATCHED') return <Badge label="Dispatched" tone="neutral" />;
  if (d.status === 'REVERSED') return <Badge label="Reversed" tone="neutral" />;
  return <Badge label={statusLabel(d.status)} tone="success" />;
}

function Rows({ list, branchName }: { list: Distribution[]; branchName: (id: string) => string }) {
  return (
    <Card>
      {list.map((d, i) => (
        <Fragment key={d.id}>
          {i > 0 ? <Separator /> : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/dispatches/[id]', params: { id: d.id } })}
            style={({ pressed }) => ({
              paddingHorizontal: space.lg,
              paddingVertical: space.md,
              gap: 4,
              backgroundColor: pressed ? colors.field : 'transparent',
            })}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md }}>
              <Text variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>
                {branchName(d.branchId)}
              </Text>
              {badgeFor(d)}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="monoSmall" style={{ color: colors.secondary }}>
                {d.reference} · {formatKgShort(d.totalWeightKg)}
              </Text>
              <Text variant="monoSmall">
                {formatRupees(d.totalTransferValue)}
              </Text>
            </View>
          </Pressable>
        </Fragment>
      ))}
    </Card>
  );
}

export default function Dispatches() {
  const [view, setView] = useState<View_>('open');
  const today = colomboToday();
  const drafts = useDistributions('', '', 'DRAFT');
  const dispatched = useDistributions('', '', 'DISPATCHED');
  const from = view === 'week' ? weekStart(today) : `${today.slice(0, 8)}01`;
  const period = useDistributions(from, today, undefined, undefined, view !== 'open');
  const branchList = branches.useList('');
  const branchName = (id: string) => branchList.data?.content.find((b) => b.id === id)?.name ?? 'Branch';

  const open = [...(drafts.data?.content ?? []), ...(dispatched.data?.content ?? [])];
  const loading = view === 'open' ? drafts.isPending || dispatched.isPending : period.isPending;
  const error = view === 'open' ? (drafts.error ?? dispatched.error) : period.error;

  const byDay = new Map<string, Distribution[]>();
  if (view !== 'open') {
    for (const d of period.data?.content ?? []) byDay.set(d.distributionDate, [...(byDay.get(d.distributionDate) ?? []), d]);
  }

  return (
    <Screen
      title="Dispatches"
      subtitle="Stock sent from the warehouse to branches"
      left={<IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />}
      right={<IconButton icon="plus" label="Send to branch" filled onPress={() => router.push('/dispatches/new')} />}>
      <Segmented
        label="Show"
        value={view}
        onChange={setView}
        options={[
          { value: 'open', label: 'Open' },
          { value: 'week', label: 'This week' },
          { value: 'month', label: 'This month' },
        ]}
      />
      {error ? <ErrorBanner message={errorMessage(error)} /> : null}
      {loading ? <ActivityIndicator color={colors.accent} /> : null}

      {view === 'open' && !loading ? (
        open.length ? (
          <>
            <Text variant="caption" style={{ paddingHorizontal: space.xs }}>
              Waiting for you
            </Text>
            <Rows list={open} branchName={branchName} />
            <Notice text="Drafts hold stock until you dispatch or cancel them. Dispatched loads wait for the branch to confirm what arrived." />
          </>
        ) : (
          <Card style={{ padding: space.xl, alignItems: 'center', gap: space.sm }}>
            <Text variant="bodyMedium">Nothing open</Text>
            <Text variant="caption" style={{ textAlign: 'center' }}>
              Every dispatch has been received or cancelled.
            </Text>
          </Card>
        )
      ) : null}

      {view !== 'open' && period.isSuccess && byDay.size === 0 ? (
        <Card style={{ padding: space.xl, alignItems: 'center' }}>
          <Text variant="bodyMedium">No dispatches in this period</Text>
        </Card>
      ) : null}
      {[...byDay.entries()].map(([day, list]) => (
        <View key={day} style={{ gap: space.sm }}>
          <Text variant="caption" style={{ paddingHorizontal: space.xs }}>
            {formatDayHeading(day)}
          </Text>
          <Rows list={list} branchName={branchName} />
        </View>
      ))}
    </Screen>
  );
}
