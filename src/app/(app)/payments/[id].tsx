import { useQueries } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useState } from 'react';
import { Pressable, View } from 'react-native';

import { api } from '@/api/client';

import { branches } from '@/api/resources';
import type { BranchSale, Settlement } from '@/api/types';
import { ChevronRightIcon } from '@/components/icons';
import { EditLoader, FormError, useIdempotencyKey } from '@/components/form';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Badge, Button, Card, Field, IconButton, Notice, SectionHeader, Separator } from '@/components/ui';
import { dayLabel } from '@/features/payment-ui';
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
  const sales = useQueries({
    queries: p.allocations.map((a) => ({
      queryKey: ['branch-sale', a.branchSaleId],
      queryFn: () => api<BranchSale>('GET', `/api/v1/branch-sales/${a.branchSaleId}`),
    })),
  });

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
          <View style={{ gap: 8 }}>
            <Text variant="caption" style={{ textAlign: 'center' }}>
              Bounced or entered by mistake? Reversing puts the amount back on what {branch} owes.
            </Text>
            <Button title="Reverse payment" variant="danger" onPress={() => setConfirming(true)} />
          </View>
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
        <Line label="Recorded" value={new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(p.createdAt))} />
      </Card>
      {p.allocations.length ? (
        <View style={{ gap: space.sm }}>
          <SectionHeader title="Paid for" />
          <Card>
            {p.allocations.map((a, i) => {
              const sale = sales[i]?.data;
              return (
                <Fragment key={a.id}>
                  {i > 0 ? <Separator /> : null}
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: '/sales/[id]', params: { id: a.branchSaleId } })}
                    style={({ pressed }) => ({
                      minHeight: 56,
                      paddingLeft: space.lg,
                      paddingRight: space.md,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: space.md,
                      backgroundColor: pressed ? colors.field : 'transparent',
                    })}>
                    <Text variant="bodyMedium" style={{ flex: 1 }} numberOfLines={1}>
                      {sale ? dayLabel(sale.saleDate) : 'Sale'}
                      {sale ? (
                        <Text variant="monoSmall" style={{ color: colors.secondary }}>
                          {' '}
                          · {sale.reference}
                        </Text>
                      ) : null}
                    </Text>
                    <Text variant="mono">{formatRupees(a.amount)}</Text>
                    <ChevronRightIcon size={16} color="#AEAEB2" />
                  </Pressable>
                </Fragment>
              );
            })}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}
