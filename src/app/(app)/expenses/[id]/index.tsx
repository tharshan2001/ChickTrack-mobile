import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import type { OperatingExpense } from '@/api/types';
import { EditLoader, FormError, useIdempotencyKey } from '@/components/form';
import { Chips } from '@/components/pickers';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Badge, Button, Card, Field, IconButton, Notice, Separator, TextLink } from '@/components/ui';
import { useExpense, useVoidExpense } from '@/features/expenses-api';
import { formatIsoDate, formatRupees } from '@/lib/format';
import { colors, space } from '@/theme/tokens';
import { Appear, haptic } from '@/components/motion';

const QUICK = ['Entered twice', 'Wrong amount', 'Wrong branch'] as const;

export default function ExpenseRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditLoader title="Expense" query={useExpense(id)}>{(e) => <Expense e={e} />}</EditLoader>;
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ minHeight: 52, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <Text style={{ color: colors.secondary }}>{label}</Text>
      <Text style={{ flex: 1, textAlign: 'right' }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function Expense({ e }: { e: OperatingExpense }) {
  const voidIt = useVoidExpense(e.id);
  const idem = useIdempotencyKey();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const voided = e.status === 'VOIDED';
  const [wasVoided] = useState(voided);
  const where = e.branchName ?? 'Head office';
  const created = new Date(e.createdAt);

  function doVoid() {
    setTouched(true);
    if (!reason.trim()) return;
    voidIt.mutate({ reason: reason.trim(), key: idem.key }, { onSuccess: () => {
        haptic.warning();
        setConfirming(false);
      }, onError: idem.onError });
  }

  return (
    <Screen
      title={`${e.categoryName} · ${where}`}
      subtitle={
        <Text variant="monoSmall" style={{ color: colors.secondary, letterSpacing: 0.5 }}>
          {e.reference}
        </Text>
      }
      subtitleAbove
      left={<IconButton icon="chevron-left" label="Back to expenses" onPress={() => router.back()} />}
      right={
        voided ? (
          <Badge label="Voided" tone="danger" />
        ) : (
          <TextLink title="Edit" onPress={() => router.push({ pathname: '/expenses/[id]/edit', params: { id: e.id } })} />
        )
      }
      headerExtra={
        <Text
          variant="numDisplay"
          style={voided ? { color: colors.secondary, textDecorationLine: 'line-through' } : undefined}>
          {formatRupees(e.amount)}
        </Text>
      }
      footer={
        voided ? undefined : confirming ? (
          <View style={{ gap: 10 }}>
            <Chips label="Why void it?" value={(QUICK as readonly string[]).includes(reason) ? reason : null} onChange={setReason} options={QUICK.map((q) => ({ value: q, label: q }))} />
            <Field
              label="Reason"
              hideLabel
              value={reason}
              onChangeText={setReason}
              placeholder="Or type a reason"
              error={touched && !reason.trim() ? 'A reason is required' : undefined}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button title="Keep it" variant="secondary" onPress={() => setConfirming(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Void" onPress={doVoid} loading={voidIt.isPending} />
              </View>
            </View>
          </View>
        ) : (
          <Button title="Void expense" variant="danger" onPress={() => setConfirming(true)} />
        )
      }>
      <FormError error={voidIt.error} />
      {voided ? (
        <Appear still={wasVoided}>
          <Notice text={`Voided: ${e.voidReason ?? 'no reason given'}. It no longer counts in Profit & loss.`} />
        </Appear>
      ) : null}
      {confirming ? (
        <Notice text={`${formatRupees(e.amount)} stops counting in Profit & loss. It stays in the list, crossed out, with your reason. This can't be undone.`} />
      ) : null}
      <Card>
        <Line label="Date" value={formatIsoDate(e.expenseDate)} />
        <Separator />
        <Line label="Category" value={e.categoryName} />
        <Separator />
        <Line label="Charged to" value={where} />
        {e.payee ? (
          <>
            <Separator />
            <Line label="Paid to" value={e.payee} />
          </>
        ) : null}
        {e.description ? (
          <>
            <Separator />
            <Line label="Note" value={e.description} />
          </>
        ) : null}
      </Card>
      <Notice
        icon={false}
        text={`Entered on ${formatIsoDate(created.toISOString().slice(0, 10))}. ${voided ? '' : 'Wrong amount or date? Edit it instead of voiding.'}`}
      />
    </Screen>
  );
}
