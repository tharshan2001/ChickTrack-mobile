import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { branches, products } from '@/api/resources';
import type { DiscrepancyReason, Distribution } from '@/api/types';
import { EditLoader, FormError, optional, useIdempotencyKey } from '@/components/form';
import { DecimalField } from '@/components/money-field';
import { Chips } from '@/components/pickers';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Button, Card, Field, IconButton } from '@/components/ui';
import { useDistribution, useReceiveDistribution } from '@/features/distribution-api';
import { formatKg, fromUnits, isDecimal, toFixedString, toUnits } from '@/lib/decimal';
import { colors, radius, space } from '@/theme/tokens';

const REASONS: { value: DiscrepancyReason; label: string }[] = [
  { value: 'MELT_WATER', label: 'Melt water' },
  { value: 'DAMAGE', label: 'Damage' },
  { value: 'WEIGHT_DIFFERENCE', label: 'Weight difference' },
  { value: 'SHORT_DELIVERY', label: 'Short delivery' },
  { value: 'OTHER', label: 'Other' },
];

export default function ReceiveRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <EditLoader title="Receive delivery" query={useDistribution(id)}>
      {(d) => <Receive d={d} />}
    </EditLoader>
  );
}

type LineState = { received: string; reason: DiscrepancyReason | null };

function Receive({ d }: { d: Distribution }) {
  const productList = products.useList('');
  const branchList = branches.useList('');
  const productName = (id: string) => productList.data?.content.find((p) => p.id === id)?.name ?? 'Product';
  const branch = branchList.data?.content.find((b) => b.id === d.branchId)?.name ?? 'Branch';
  const sameProduct = (pid: string) => d.items.filter((i) => i.chickenTypeId === pid).length > 1;

  // Start each line at the full sent weight; the receiver lowers it if less arrived.
  const [lines, setLines] = useState<Record<string, LineState>>(() =>
    Object.fromEntries(d.items.map((i) => [i.id, { received: i.weightKg, reason: null }])),
  );
  const [notes, setNotes] = useState('');
  const [touched, setTouched] = useState(false);
  const receive = useReceiveDistribution(d.id);
  const idem = useIdempotencyKey();

  const check = (itemId: string, sent: string) => {
    const l = lines[itemId]!;
    const r = toUnits(l.received, 3);
    const s = toUnits(sent, 3);
    const short = s - r;
    return {
      short,
      weight: !isDecimal(l.received, 3) ? 'Enter the weight' : r > s ? `Can't be more than the ${formatKg(sent)} sent` : undefined,
      reason: short > 0n && !l.reason ? 'Pick a reason for the shortfall' : undefined,
    };
  };
  const checks = d.items.map((i) => check(i.id, i.weightKg));
  const ok = checks.every((c) => !c.weight && !c.reason);
  const done = checks.filter((c) => !c.weight && !c.reason).length;

  function confirm() {
    setTouched(true);
    if (!ok) return;
    receive.mutate(
      {
        input: {
          receivedAt: new Date().toISOString(),
          notes: optional(notes),
          items: d.items.map((i, idx) => ({
            distributionItemId: i.id,
            receivedWeightKg: toFixedString(lines[i.id]!.received, 3),
            discrepancyReason: checks[idx]!.short > 0n ? lines[i.id]!.reason : null,
          })),
        },
        key: idem.key,
      },
      { onSuccess: () => router.back(), onError: idem.onError },
    );
  }

  return (
    <Screen
      title="Receive delivery"
      subtitle={`${branch} · ${d.reference}`}
      left={<IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />}
      footer={
        <View style={{ gap: 10 }}>
          <Text variant="caption" style={{ textAlign: 'center' }}>
            {done} of {d.items.length} {d.items.length === 1 ? 'line' : 'lines'} confirmed
          </Text>
          <Button title="Confirm receipt" onPress={confirm} loading={receive.isPending} />
        </View>
      }>
      <FormError error={receive.error} />
      {d.items.map((item, idx) => {
        const c = checks[idx]!;
        const l = lines[item.id]!;
        const set = (change: Partial<LineState>) => setLines((s) => ({ ...s, [item.id]: { ...s[item.id]!, ...change } }));
        return (
          <Card key={item.id} style={{ padding: space.lg, gap: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text variant="headline">
                {productName(item.chickenTypeId)}
                {sameProduct(item.chickenTypeId) ? <Text variant="caption"> · line {idx + 1}</Text> : null}
              </Text>
              <Text variant="caption">
                Sent{' '}
                <Text variant="monoSmall">
                  {formatKg(item.weightKg)}
                </Text>
              </Text>
            </View>
            <DecimalField
              label="Weight received (kg)"
              value={l.received}
              onChangeText={(received) => set({ received })}
              scale={3}
              huge
              error={touched ? c.weight : undefined}
            />
            {c.short > 0n && !c.weight ? (
              <>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: colors.warningBg,
                    borderRadius: radius.field,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                  }}>
                  <Text variant="bodyMedium" style={{ color: colors.warning }}>
                    Shortfall
                  </Text>
                  <Text variant="mono" style={{ color: colors.warning, fontSize: 16 }}>
                    {formatKg(fromUnits(c.short, 3))}
                  </Text>
                </View>
                <Chips
                  label="Reason for the shortfall"
                  options={REASONS}
                  value={l.reason}
                  onChange={(reason) => set({ reason })}
                  error={touched ? c.reason : undefined}
                />
              </>
            ) : null}
          </Card>
        );
      })}
      <Card style={{ padding: space.lg }}>
        <Field label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
      </Card>
    </Screen>
  );
}
