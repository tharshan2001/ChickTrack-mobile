import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { branches } from '@/api/resources';
import type { Settlement } from '@/api/types';
import { EditLoader, FormError, useIdempotencyKey } from '@/components/form';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Badge, Button, Card, Field, IconButton, Notice, Separator } from '@/components/ui';
import { METHOD_LABEL, useReversePayment, useSettlement } from '@/features/money-api';
import { formatIsoDate, formatRupees } from '@/lib/format';
import { colors, space } from '@/theme/tokens';

export default function PaymentRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditLoader title="Payment" query={useSettlement(id)}>{(p) => <Payment p={p} />}</EditLoader>;
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{ minHeight: 44, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ color: colors.secondary }}>{label}</Text>
      <Text variant="mono">{value}</Text>
    </View>
  );
}

function Payment({ p }: { p: Settlement }) {
  const branchList = branches.useList('');
  const branch = branchList.data?.content.find((b) => b.id === p.branchId)?.name ?? 'Branch';
  const reverse = useReversePayment(p.id);
  const idem = useIdempotencyKey();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const reversed = p.status === 'REVERSED';

  function doReverse() {
    setTouched(true);
    if (!reason.trim()) return;
    reverse.mutate({ reason: reason.trim(), key: idem.key }, { onSuccess: () => setConfirming(false), onError: idem.onError });
  }

  return (
    <Screen
      title={formatRupees(p.amount)}
      subtitle={`${branch} · ${METHOD_LABEL[p.method] ?? p.method.toLowerCase()} · ${formatIsoDate(p.settlementDate)}`}
      left={<IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />}
      right={<Badge label={reversed ? 'Reversed' : 'Received'} tone={reversed ? 'neutral' : 'success'} />}
      footer={
        reversed ? undefined : confirming ? (
          <View style={{ gap: 10 }}>
            <Field
              label="Why reverse this payment?"
              value={reason}
              onChangeText={setReason}
              autoFocus
              placeholder="e.g. Cheque bounced"
              error={touched && !reason.trim() ? 'A reason is required' : undefined}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button title="Keep it" variant="secondary" onPress={() => setConfirming(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Reverse" onPress={doReverse} loading={reverse.isPending} />
              </View>
            </View>
          </View>
        ) : (
          <Button title="Reverse payment" variant="secondary" onPress={() => setConfirming(true)} />
        )
      }>
      <FormError error={reverse.error} />
      {reversed ? <Notice text={`Reversed: ${p.reversalReason ?? 'no reason given'}. ${branch} owes this amount again.`} /> : null}
      <Card>
        {p.reference ? (
          <>
            <Line label="Reference" value={p.reference} />
            <Separator />
          </>
        ) : null}
        <Line label="Sales paid" value={String(p.allocations.length)} />
      </Card>
    </Screen>
  );
}
