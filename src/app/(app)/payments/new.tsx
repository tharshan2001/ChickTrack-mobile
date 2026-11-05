import Feather from '@expo/vector-icons/Feather';
import { useQueries } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { api } from '@/api/client';
import { branches } from '@/api/resources';
import type { OpenSale, PaymentMethod } from '@/api/types';
import { DateField } from '@/components/date-field';
import { FormError, optional, useIdempotencyKey } from '@/components/form';
import { DecimalField } from '@/components/money-field';
import { Segmented, SelectField } from '@/components/pickers';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Badge, Button, Card, Field, SectionHeader, Separator, TextLink } from '@/components/ui';
import { useOpenSales, useRecordPayment } from '@/features/money-api';
import { fromUnits, isPositiveDecimal, toUnits } from '@/lib/decimal';
import { colomboToday, formatIsoDate, formatRupees } from '@/lib/format';
import { colors, fonts, radius, space } from '@/theme/tokens';
import { savedAndBack } from '@/components/motion';

/** Spreads the amount over the chosen sales, oldest first, never more than a sale still owes. */
function allocate(sales: OpenSale[], chosen: Set<string>, amount: bigint) {
  let left = amount;
  const parts = new Map<string, bigint>();
  for (const s of sales) {
    if (!chosen.has(s.branchSaleId) || left <= 0n) continue;
    const take = toUnits(s.outstandingAmount, 2) < left ? toUnits(s.outstandingAmount, 2) : left;
    parts.set(s.branchSaleId, take);
    left -= take;
  }
  return { parts, unallocated: left };
}

export default function RecordPayment() {
  const params = useLocalSearchParams<{ branchId?: string }>();
  const branchList = branches.useList('');
  const list = branchList.data?.content ?? [];
  const balances = useQueries({
    queries: list.map((b) => ({
      queryKey: ['branch-balance', b.id],
      queryFn: () =>
        api<{ outstandingAmount: string }>('GET', `/api/v1/branches/${b.id}/balance`).then((r) => r.outstandingAmount),
    })),
  });
  const owes = (id: string) => balances[list.findIndex((b) => b.id === id)]?.data ?? null;

  const [branchId, setBranchId] = useState<string | null>(params.branchId ?? null);
  // Opened from a branch: that branch is the only sensible choice, so it is fixed.
  const locked = !!params.branchId;
  const openSales = useOpenSales(branchId);
  const sales = openSales.data ?? [];

  const [amount, setAmount] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);
  // Sales the owner unticked; everything else is open to the payment.
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(colomboToday);
  const [touched, setTouched] = useState(false);
  const record = useRecordPayment();
  const idem = useIdempotencyKey();

  const chosen = new Set(sales.map((s) => s.branchSaleId).filter((id) => !excluded.has(id)));
  const chosenTotal = sales.filter((s) => chosen.has(s.branchSaleId)).reduce((a, s) => a + toUnits(s.outstandingAmount, 2), 0n);
  // The amount starts empty so a full payment is never recorded by accident;
  // "Pay full balance" fills it in one tap.
  const amountText = amount;
  const amountUnits = toUnits(amountText, 2);
  const { parts, unallocated } = allocate(sales, chosen, amountUnits);
  const branchOwes = branchId ? owes(branchId) : null;
  const after = branchOwes !== null ? toUnits(branchOwes, 2) - amountUnits + unallocated : null;
  const branchName = list.find((b) => b.id === branchId)?.name ?? 'The branch';

  const errors = {
    branch: branchId ? undefined : 'Choose a branch',
    amount: !isPositiveDecimal(amountText)
      ? 'Enter the amount received'
      : unallocated > 0n
        ? `More than the ${formatRupees(fromUnits(chosenTotal, 2))} these sales owe`
        : undefined,
  };

  function pickBranch(id: string) {
    setBranchId(id);
    setExcluded(new Set());
    setAmount('');
    setAmountTouched(false);
  }

  function toggle(id: string) {
    setExcluded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save() {
    setTouched(true);
    if (errors.branch || errors.amount || !branchId) return;
    record.mutate(
      {
        input: {
          branchId,
          settlementDate: date,
          amount: fromUnits(amountUnits, 2),
          method,
          reference: method === 'CASH' ? null : optional(reference),
          notes: null,
          allocations: [...parts.entries()].filter(([, v]) => v > 0n).map(([branchSaleId, v]) => ({ branchSaleId, amount: fromUnits(v, 2) })),
        },
        key: idem.key,
      },
      { onSuccess: () => savedAndBack('Payment recorded'), onError: idem.onError },
    );
  }

  return (
    <Screen
      title="Record payment"
      left={<TextLink title="Cancel" onPress={() => router.back()} />}
      bodyPaddingTop={12}
      bodyGap={24}
      titleGap={4}
      footer={
        <View style={{ gap: 10 }}>
          {after !== null && amountUnits > 0n && !errors.amount ? (
            <Text variant="caption" style={{ textAlign: 'center' }}>
              {branchName} will {after > 0n ? 'still owe' : 'owe'} {formatRupees(fromUnits(after, 2))}
            </Text>
          ) : null}
          <Button
            title={amountUnits > 0n && !errors.amount ? `Record ${formatRupees(fromUnits(amountUnits, 2))}` : 'Record payment'}
            onPress={save}
            loading={record.isPending}
          />
        </View>
      }>
      <FormError error={record.error} />
      <Card style={{ padding: space.lg, gap: 14 }}>
        {locked ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md }}>
            <View style={{ gap: 2, flexShrink: 1 }}>
              <Text variant="caption">Branch</Text>
              <Text variant="headline">{branchName}</Text>
            </View>
            {branchOwes ? (
              <Text variant="caption">
                Owes <Text variant="monoSmall">{formatRupees(branchOwes)}</Text>
              </Text>
            ) : null}
          </View>
        ) : (
        <SelectField
          label="Branch"
          compact
          value={branchId}
          onChange={pickBranch}
          options={list.map((b) => ({
            value: b.id,
            label: b.name,
            detail: owes(b.id) ? `owes ${formatRupees(owes(b.id)!)}` : undefined,
          }))}
          error={touched ? errors.branch : undefined}
        />
        )}
        <DecimalField
          label="Amount received (Rs)"
          value={amountText}
          onChangeText={(v) => {
            setAmountTouched(true);
            setAmount(v);
          }}
          placeholder="0.00"
          large
          error={touched || amountTouched ? errors.amount : undefined}
        />
        {chosenTotal > 0n && amountUnits !== chosenTotal ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setAmountTouched(true);
              setAmount(fromUnits(chosenTotal, 2));
            }}
            style={({ pressed }) => ({
              alignSelf: 'flex-start',
              height: 30,
              marginTop: -6,
              paddingHorizontal: 10,
              borderRadius: 15,
              justifyContent: 'center',
              backgroundColor: colors.tint,
              opacity: pressed ? 0.7 : 1,
            })}>
            <Text variant="caption" style={{ color: colors.accentPressed, fontFamily: fonts.bodyMedium, letterSpacing: 0 }}>
              Pay full balance · <Text variant="monoSmall" style={{ color: colors.accentPressed }}>{formatRupees(fromUnits(chosenTotal, 2)).replace('Rs ', '')}</Text>
            </Text>
          </Pressable>
        ) : null}
        <Segmented
          label="Method"
          value={method}
          onChange={setMethod}
          options={[
            { value: 'CASH', label: 'Cash' },
            { value: 'BANK', label: 'Bank' },
            { value: 'CHEQUE', label: 'Cheque' },
          ]}
        />
        {method === 'CASH' ? null : (
        <Field
          label={method === 'CHEQUE' ? 'Cheque number' : 'Bank reference'}
          value={reference}
          onChangeText={setReference}
          autoCapitalize="characters"
          mono
          compact
          placeholder={method === 'CHEQUE' ? 'Cheque no.' : 'Transfer ref.'}
        />
        )}
        <DateField label="Received on" value={date} onChange={setDate} compact />
      </Card>

      {branchId ? (
        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <SectionHeader title="Pays for" />
            {sales.length > 1 ? <Text variant="caption">Oldest sale first</Text> : null}
          </View>
          {openSales.isPending ? <ActivityIndicator color={colors.accent} /> : null}
          {openSales.isSuccess && sales.length === 0 ? (
            <Card style={{ padding: space.xl, alignItems: 'center' }}>
              <Text variant="caption">Nothing owed. All sales are paid for.</Text>
            </Card>
          ) : null}
          {sales.length ? (
            <Card>
              {sales.map((s, i) => {
                const on = chosen.has(s.branchSaleId);
                const part = parts.get(s.branchSaleId) ?? 0n;
                return (
                  <Fragment key={s.branchSaleId}>
                    {i > 0 ? <Separator /> : null}
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      onPress={() => toggle(s.branchSaleId)}
                      style={({ pressed }) => ({
                        minHeight: 64,
                        paddingHorizontal: space.lg,
                        paddingVertical: space.md,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: space.md,
                        backgroundColor: pressed ? colors.field : 'transparent',
                      })}>
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: radius.pill,
                          borderWidth: 2,
                          borderColor: on ? colors.accent : colors.separator,
                          backgroundColor: on ? colors.accent : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        {on ? <Feather name="check" size={14} color={colors.surface} /> : null}
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text variant="bodyMedium">
                          {formatIsoDate(s.saleDate)} ·{' '}
                          <Text variant="monoSmall">{s.reference}</Text>
                        </Text>
                        <Text variant="caption" numberOfLines={1}>
                          {formatRupees(s.outstandingAmount)} left to pay
                        </Text>
                      </View>
                      <Text variant="mono" style={{ color: part > 0n ? colors.ink : colors.secondary }}>
                        {formatRupees(fromUnits(part, 2)).replace('Rs ', '')}
                      </Text>
                    </Pressable>
                  </Fragment>
                );
              })}
            </Card>
          ) : null}
          {sales.length && amountUnits > 0n ? (
            unallocated > 0n ? (
              <Text variant="caption" style={{ paddingHorizontal: space.xs }}>
                {formatRupees(fromUnits(unallocated, 2))} more than the ticked sales owe
              </Text>
            ) : amountUnits === chosenTotal ? (
              <View style={{ alignSelf: 'flex-start' }}>
                <Badge label="Allocated in full" tone="success" />
              </View>
            ) : (
              <Text variant="caption" style={{ paddingHorizontal: space.xs }}>
                Paid oldest sale first; the rest stays owed
              </Text>
            )
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}
