import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { errorMessage } from '@/api/client';
import type { AdjustmentType, StockBatch } from '@/api/types';
import { EditLoader, FormError, fieldErrors, useIdempotencyKey } from '@/components/form';
import { DecimalField } from '@/components/money-field';
import { Segmented } from '@/components/pickers';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Button, Card, ErrorBanner, Field, IconButton, SectionHeader, Separator } from '@/components/ui';
import { useAdjustStock, useBatch, useBatchHistory } from '@/features/stock-api';
import { formatKg, fromUnits, isPositiveDecimal, toFixedString, toUnits } from '@/lib/decimal';
import { colors, space } from '@/theme/tokens';

const W = 3;

const TYPES: { value: AdjustmentType; label: string; verb: string }[] = [
  { value: 'DAMAGE', label: 'Damage', verb: 'Record damage' },
  { value: 'LOSS', label: 'Loss', verb: 'Record loss' },
  { value: 'RETURN', label: 'Return', verb: 'Record return' },
  { value: 'ADJUSTMENT', label: 'Recount', verb: 'Save recount' },
];

export default function AdjustStockRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <EditLoader title="Adjust stock" query={useBatch(id)}>
      {(b) => <AdjustStock batch={b} />}
    </EditLoader>
  );
}

function AdjustStock({ batch }: { batch: StockBatch }) {
  const [type, setType] = useState<AdjustmentType>('DAMAGE');
  const [direction, setDirection] = useState<'INCREASE' | 'DECREASE'>('DECREASE');
  const [weight, setWeight] = useState('');
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const adjust = useAdjustStock(batch.id);
  const history = useBatchHistory(batch.id);
  const idem = useIdempotencyKey();

  // Damage and loss remove stock, return adds it back, a recount goes either way.
  const increase = type === 'RETURN' || (type === 'ADJUSTMENT' && direction === 'INCREASE');
  const w = toUnits(weight, W);
  const available = toUnits(batch.availableWeightKg, W);
  const headroom = toUnits(batch.receivedWeightKg, W) - toUnits(batch.remainingWeightKg, W);
  const after = increase ? available + w : available - w;

  const weightError = !isPositiveDecimal(weight, W)
    ? 'Enter the weight in kg'
    : !increase && w > available
      ? `Only ${formatKg(batch.availableWeightKg)} is free`
      : increase && w > headroom
        ? `Can't go above the ${formatKg(batch.receivedWeightKg)} received`
        : undefined;
  const reasonError = reason.trim() ? undefined : 'Say what happened';
  const server = fieldErrors(adjust.error);

  function save() {
    setTouched(true);
    if (weightError || reasonError) return;
    adjust.mutate(
      {
        input: {
          stockBatchId: batch.id,
          type,
          weightKg: toFixedString(weight, W),
          direction: type === 'ADJUSTMENT' ? direction : null,
          reason: reason.trim(),
        },
        key: idem.key,
      },
      { onSuccess: () => router.back(), onError: idem.onError },
    );
  }

  const received =
    batch.ageDays === 0 ? 'today' : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(batch.receivedAt));

  return (
    <Screen
      title="Adjust stock"
      subtitle={
        <>
          {batch.chickenTypeName} · {received} ·{' '}
          <Text variant="monoSmall" style={{ color: colors.secondary }}>
            {formatKg(batch.availableWeightKg)}
          </Text>{' '}
          free of {formatKg(batch.receivedWeightKg).replace(' kg', '')}
        </>
      }
      left={<IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />}
      bodyGap={32}
      titleGap={4}
      footer={<Button title={TYPES.find((t) => t.value === type)!.verb} onPress={save} loading={adjust.isPending} />}>
      <FormError error={adjust.error} />
      <Card style={{ padding: space.lg, gap: 16 }}>
        <Segmented label="What happened" hideLabel value={type} onChange={setType} options={TYPES} />
        {type === 'ADJUSTMENT' ? (
          <Segmented
            label="Counted"
            hideLabel
            value={direction}
            onChange={setDirection}
            options={[
              { value: 'DECREASE', label: 'Less than recorded' },
              { value: 'INCREASE', label: 'More than recorded' },
            ]}
          />
        ) : null}
        <DecimalField
          label={increase ? 'Weight to add (kg)' : 'Weight to remove (kg)'}
          value={weight}
          onChangeText={setWeight}
          scale={W}
          placeholder="0.000"
          large
          error={server.weightKg ?? (touched ? weightError : undefined)}
        />
        <Field
          label="Reason (required)"
          value={reason}
          onChangeText={setReason}
          multiline
          placeholder="e.g. Two crates crushed while unloading"
          error={server.reason ?? (touched ? reasonError : undefined)}
        />
        {w > 0n ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="caption">After this change</Text>
            <Text variant="mono" style={{ color: after < 0n ? colors.danger : colors.ink }}>
              {fromUnits(available, W)} → {fromUnits(after, W)} kg
            </Text>
          </View>
        ) : null}
      </Card>

      <View style={{ gap: space.sm }}>
        <SectionHeader title="History" />
        {history.isError ? <ErrorBanner message={errorMessage(history.error)} onRetry={history.refetch} /> : null}
        {history.isPending ? <ActivityIndicator color={colors.accent} /> : null}
        {history.data?.length ? (
          <Card>
            {history.data.map((h, i) => (
              <Fragment key={h.id}>
                {i > 0 ? <Separator /> : null}
                <View
                  style={{
                    minHeight: 56,
                    paddingHorizontal: space.lg,
                    paddingVertical: space.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                  }}>
                  <Text numberOfLines={1} style={{ flex: 1 }}>
                    {h.label}
                    {h.detail ? (
                      <Text
                        variant={/^[A-Z]+-\d{4}-\d+$/.test(h.detail) ? 'monoSmall' : 'caption'}
                        style={{ color: colors.secondary }}>
                        {' · '}
                        {h.detail}
                      </Text>
                    ) : null}
                  </Text>
                  <Text
                    variant="monoSmall"
                    style={{ color: h.change.startsWith('-') ? colors.danger : colors.success }}>
                    {h.change.startsWith('-') ? '−' + h.change.slice(1) : '+' + h.change}
                  </Text>
                </View>
              </Fragment>
            ))}
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}
