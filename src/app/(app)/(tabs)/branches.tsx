import { router } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { branches } from '@/api/resources';
import type { Branch } from '@/api/types';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Badge, Card, ErrorBanner, IconButton, SearchField } from '@/components/ui';
import { useBranchBalance, useBranchSales, useBranchStock } from '@/features/branch-api';
import { useDistributions } from '@/features/distribution-api';
import { formatKgShort, sum, toUnits } from '@/lib/decimal';
import { colomboToday, formatRupees } from '@/lib/format';
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
  const today = colomboToday();
  const stock = useBranchStock(b.id);
  const sales = useBranchSales(b.id, today, today);
  const owes = useBranchBalance(b.id);
  const arriving = useDistributions('', '', 'DISPATCHED', b.id);
  const drafts = useDistributions('', '', 'DRAFT', b.id);

  const onHand = stock.data ? sum(stock.data.map((s) => s.availableWeightKg), 3) : null;
  const sold = sales.data?.[0]?.totalSales;
  const badge = arriving.data?.totalElements
    ? { label: 'Delivery to confirm', tone: 'warning' as const }
    : drafts.data?.totalElements
      ? { label: 'Draft ready', tone: 'neutral' as const }
      : null;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/branches/[id]', params: { id: b.id } })}>
      {({ pressed }) => (
        <Card style={{ padding: space.lg, gap: space.md, opacity: pressed ? 0.8 : 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="headline" style={{ color: b.active ? colors.ink : colors.secondary }}>
                {b.name}
              </Text>
              <Text variant="monoSmall" style={{ color: colors.secondary }}>
                {b.code}
              </Text>
            </View>
            {!b.active ? <Badge label="Inactive" tone="neutral" /> : badge ? <Badge {...badge} /> : null}
          </View>
          {b.active ? (
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Stat label="Stock" value={onHand ? formatKgShort(onHand) : '…'} />
              <Stat label="Sales today" value={sold ? formatRupees(sold, 0).replace('Rs ', '') : '—'} muted={!sold} />
              <Stat
                label="Owes"
                value={owes.data ? formatRupees(owes.data, 0).replace('Rs ', '') : '…'}
                muted={!owes.data || toUnits(owes.data, 2) === 0n}
              />
            </View>
          ) : null}
        </Card>
      )}
    </Pressable>
  );
}

export default function BranchesTab() {
  const [search, setSearch] = useState('');
  const deferred = useDeferredValue(search);
  const query = branches.useList(deferred);
  // Active branches first, then closed ones.
  const list = [...(query.data?.content ?? [])].sort((a, b) => Number(b.active) - Number(a.active));

  return (
    <Screen
      title="Branches"
      left={<></>}
      right={<IconButton icon="plus" label="Add branch" filled onPress={() => router.push('/branches/new')} />}>
      {list.length > 5 || search ? (
        <SearchField placeholder="Search branches" accessibilityLabel="Search branches" value={search} onChangeText={setSearch} />
      ) : null}
      {query.isError ? <ErrorBanner message={errorMessage(query.error)} onRetry={query.refetch} /> : null}
      {query.isPending ? <ActivityIndicator color={colors.accent} /> : null}
      {query.isSuccess && list.length === 0 ? (
        <Card style={{ padding: space.xl, alignItems: 'center', gap: space.sm }}>
          <Text variant="bodyMedium">{deferred ? 'No matches' : 'No branches yet'}</Text>
          <Text variant="caption" style={{ textAlign: 'center' }}>
            {deferred ? 'Try another name.' : 'Add your first branch, like Kandy Central.'}
          </Text>
        </Card>
      ) : null}
      {list.map((b) => (
        <BranchCard key={b.id} b={b} />
      ))}
    </Screen>
  );
}
