import { router } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { branches } from '@/api/resources';
import type { Branch } from '@/api/types';
import { AppearList, PressScale, useFirstBatch } from '@/components/motion';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { ChevronRightIcon } from '@/components/icons';
import { Badge, Card, ErrorBanner, SearchField, TextLink } from '@/components/ui';
import { useBranchBalance, useBranchStock } from '@/features/branch-api';
import { useDistributions } from '@/features/distribution-api';
import { formatKgShort, sum, toUnits } from '@/lib/decimal';
import { formatRupees } from '@/lib/format';
import { colors, space } from '@/theme/tokens';

function Stat({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="caption">{label}</Text>
      <Text variant="mono" style={{ color: muted ? colors.secondary : colors.ink }}>
        {value}
      </Text>
    </View>
  );
}

/** One branch with its stock, today's sales and what it owes. */
function BranchCard({ b }: { b: Branch }) {
  const stock = useBranchStock(b.id);
  const owes = useBranchBalance(b.id);
  const arriving = useDistributions('', '', 'DISPATCHED', b.id);
  const drafts = useDistributions('', '', 'DRAFT', b.id);

  const onHand = stock.data ? sum(stock.data.map((s) => s.availableWeightKg), 3) : null;
  const badge = arriving.data?.totalElements
    ? { label: 'Delivery to confirm', tone: 'warning' as const }
    : drafts.data?.totalElements
      ? { label: 'Draft to send', tone: 'warning' as const }
      : null;

  return (
    <PressScale
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/branches/[id]', params: { id: b.id } })}>
      
        <Card style={{ padding: space.lg, gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="headline" style={{ color: b.active ? colors.ink : colors.secondary }}>
                {b.name}
              </Text>
              <Text variant="monoSmall" style={{ color: colors.secondary }}>
                {b.code}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {!b.active ? <Badge label="Inactive" tone="danger" /> : badge ? <Badge {...badge} /> : null}
              <ChevronRightIcon size={16} color="#AEAEB2" />
            </View>
          </View>
          {b.active ? (
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Stat label="Stock" value={onHand ? formatKgShort(onHand) : '…'} />
              <Stat
                label="Owes"
                value={owes.data ? formatRupees(owes.data) : '…'}
                muted={!owes.data || toUnits(owes.data, 2) === 0n}
              />
            </View>
          ) : null}
        </Card>
      
    </PressScale>
  );
}

export default function BranchesTab() {
  const [search, setSearch] = useState('');
  const deferred = useDeferredValue(search);
  const query = branches.useList(deferred);
  const firstLoad = useFirstBatch(query.isSuccess);
  const all = query.data?.content ?? [];
  const list = all.filter((b) => b.active);
  const closed = all.filter((b) => !b.active);

  return (
    <Screen
      title="Branches"
      inlineActions
      bodyGap={12}
      right={<TextLink title="+ Add branch" pill onPress={() => router.push('/branches/new')} />}>
      {all.length > 5 || search ? (
        <SearchField placeholder="Search branches" accessibilityLabel="Search branches" value={search} onChangeText={setSearch} />
      ) : null}
      {query.isError ? <ErrorBanner message={errorMessage(query.error)} onRetry={query.refetch} /> : null}
      {query.isPending ? <ActivityIndicator color={colors.accent} /> : null}
      {query.isSuccess && all.length === 0 ? (
        <Card style={{ padding: space.xl, alignItems: 'center', gap: space.sm }}>
          <Text variant="bodyMedium">{deferred ? 'No matches' : 'No branches yet'}</Text>
          <Text variant="caption" style={{ textAlign: 'center' }}>
            {deferred ? 'Try another name.' : 'Add your first branch, like Kandy Central.'}
          </Text>
        </Card>
      ) : null}
      <AppearList still={firstLoad}>
        {list.map((b) => (
        <BranchCard key={b.id} b={b} />
      ))}
      </AppearList>
      {closed.length ? (
        <Text variant="labelSmall" style={{ marginTop: space.md, marginHorizontal: space.xs }}>
          Inactive
        </Text>
      ) : null}
      <AppearList still={firstLoad}>
        {closed.map((b) => (
        <BranchCard key={b.id} b={b} />
      ))}
      </AppearList>
    </Screen>
  );
}
