import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useState } from 'react';
import { View } from 'react-native';

import { branches, products } from '@/api/resources';
import type { Distribution, DistributionItem } from '@/api/types';
import { EditLoader, FormError, useIdempotencyKey } from '@/components/form';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Badge, Button, Card, Field, IconButton, Notice, Separator } from '@/components/ui';
import { useDispatch, useDistribution as useDistributionQuery, useReverseDistribution } from '@/features/distribution-api';
import { divRound, formatKg, fromUnits, sum, toUnits } from '@/lib/decimal';
import { formatIsoDate, formatRupees, statusLabel } from '@/lib/format';
import { colors, space } from '@/theme/tokens';

export default function DispatchDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <EditLoader title="Dispatch" query={useDistributionQuery(id)}>
      {(d) => <DispatchDetail d={d} />}
    </EditLoader>
  );
}

const STEPS = [
  { status: 'DRAFT', title: 'Draft', note: (kg: string) => `${kg} held` },
  { status: 'DISPATCHED', title: 'Dispatched', note: () => 'Leaves warehouse' },
  { status: 'RECEIVED', title: 'Received', note: () => 'Branch confirms' },
] as const;

function Progress({ d }: { d: Distribution }) {
  const at = d.status === 'CLOSED' ? 2 : STEPS.findIndex((s) => s.status === d.status);
  return (
    <Card style={{ padding: space.lg, flexDirection: 'row', gap: space.sm }} accessibilityLabel={`Progress: ${statusLabel(d.status)}`}>
      {STEPS.map((s, i) => {
        const done = i <= at;
        return (
          <View key={s.status} style={{ flex: 1, gap: 6 }}>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: done ? colors.accent : colors.field }} />
            <Text variant="bodyMedium" style={{ fontSize: 13, color: done ? colors.ink : colors.secondary }}>
              {s.title}
            </Text>
            <Text variant="caption" style={{ fontSize: 12 }}>
              {s.note(formatKg(d.totalWeightKg))}
            </Text>
          </View>
        );
      })}
    </Card>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View
      style={{ minHeight: 44, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text variant={strong ? 'bodyMedium' : 'body'} style={strong ? undefined : { color: colors.secondary }}>
        {label}
      </Text>
      <Text variant="mono" style={strong ? { fontSize: 16 } : undefined}>
        {value}
      </Text>
    </View>
  );
}

/** Lines are per stock batch; show one row per product. */
function groupByProduct(items: DistributionItem[]) {
  const map = new Map<string, DistributionItem[]>();
  for (const it of items) map.set(it.chickenTypeId, [...(map.get(it.chickenTypeId) ?? []), it]);
  return [...map.entries()].map(([productId, lines]) => {
    const kg = toUnits(sum(lines.map((l) => l.weightKg), 3), 3);
    const value = toUnits(sum(lines.map((l) => l.lineTransferValue), 2), 2);
    return { productId, lines, kg: fromUnits(kg, 3), perKg: kg > 0n ? fromUnits(divRound(value * 1000n, kg), 2) : '0.00' };
  });
}

function DispatchDetail({ d }: { d: Distribution }) {
  const productList = products.useList('');
  const branchList = branches.useList('');
  const productName = (id: string) => productList.data?.content.find((p) => p.id === id)?.name ?? 'Product';
  const branch = branchList.data?.content.find((b) => b.id === d.branchId)?.name ?? 'Branch';

  const dispatch = useDispatch(d.id);
  const reverse = useReverseDistribution(d.id);
  const dispatchKey = useIdempotencyKey();
  const reverseKey = useIdempotencyKey();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  const isDraft = d.status === 'DRAFT';
  const canReverse = d.status === 'DRAFT' || d.status === 'DISPATCHED' || d.status === 'RECEIVED';
  const reverseTitle = isDraft ? `Cancel draft · releases ${formatKg(d.totalWeightKg)}` : 'Reverse dispatch';

  function doReverse() {
    setTouched(true);
    if (!reason.trim()) return;
    reverse.mutate(
      { reason: reason.trim(), key: reverseKey.key },
      { onSuccess: () => setConfirming(false), onError: reverseKey.onError },
    );
  }

  const footer = confirming ? (
    <View style={{ gap: 10 }}>
      <Field
        label={isDraft ? 'Why cancel this draft?' : 'Why reverse this dispatch?'}
        value={reason}
        onChangeText={setReason}
        autoFocus
        error={touched && !reason.trim() ? 'A reason is required' : undefined}
      />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button title="Keep it" variant="secondary" onPress={() => setConfirming(false)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title={isDraft ? 'Cancel draft' : 'Reverse'} onPress={doReverse} loading={reverse.isPending} />
        </View>
      </View>
    </View>
  ) : canReverse ? (
    <View style={{ gap: 10 }}>
      {isDraft ? (
        <Button
          title="Dispatch now"
          onPress={() => dispatch.mutate(dispatchKey.key, { onError: dispatchKey.onError })}
          loading={dispatch.isPending}
        />
      ) : null}
      {d.status === 'DISPATCHED' ? (
        <Button
          title="Receive delivery"
          onPress={() => router.push({ pathname: '/dispatches/[id]/receive', params: { id: d.id } })}
        />
      ) : null}
      <Button title={reverseTitle} variant="secondary" onPress={() => setConfirming(true)} />
    </View>
  ) : undefined;

  const groups = groupByProduct(d.items);
  const receipt = d.receipts[0];
  const shortfall = receipt ? sum(receipt.items.map((r) => r.discrepancyWeightKg), 3) : '0';

  return (
    <Screen
      title={d.reference}
      subtitle={`${branch} · ${formatIsoDate(d.distributionDate)}`}
      left={<IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />}
      right={
        <Badge
          label={statusLabel(d.status)}
          tone={d.status === 'REVERSED' ? 'neutral' : d.status === 'DRAFT' ? 'warning' : 'success'}
        />
      }
      footer={footer}>
      <FormError error={dispatch.error ?? reverse.error} />
      {d.status === 'REVERSED' ? (
        <Notice text={`Reversed: ${d.reversalReason ?? 'no reason given'}. Stock went back to the warehouse.`} />
      ) : (
        <Progress d={d} />
      )}

      <Card>
        {groups.map((g, i) => (
          <Fragment key={g.productId}>
            {i > 0 ? <Separator /> : null}
            <View style={{ padding: space.lg, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="bodyMedium" style={{ fontSize: 16 }}>
                  {productName(g.productId)}
                </Text>
                <Text variant="caption">
                  {g.lines.length > 1 ? `From ${g.lines.length} batches` : 'From 1 batch'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="mono">{formatKg(g.kg)}</Text>
                <Text variant="mono" style={{ color: colors.secondary }}>
                  {formatRupees(g.perKg)}/kg
                </Text>
              </View>
            </View>
          </Fragment>
        ))}
      </Card>

      <Card>
        <Line label="Our cost" value={formatRupees(d.totalCost)} />
        <Separator />
        <Line label="Our margin" value={formatRupees(d.totalOurMargin)} />
        {toUnits(d.expenseAmount, 2) > 0n ? (
          <>
            <Separator />
            <Line label="Delivery cost" value={formatRupees(d.expenseAmount)} />
          </>
        ) : null}
        <Separator />
        <Line label={`${branch} owes`} value={formatRupees(d.totalTransferValue)} strong />
      </Card>

      {receipt ? (
        <Card style={{ padding: space.lg, gap: 4 }}>
          <Text variant="bodyMedium">Received</Text>
          <Text variant="caption">
            {toUnits(shortfall, 3) > 0n ? `${formatKg(shortfall)} short` : 'Full weight arrived'}
            {receipt.notes ? ` · ${receipt.notes}` : ''}
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}
