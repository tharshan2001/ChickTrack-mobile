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
import { Button, Card, Field, SectionHeader, Separator, TextLink } from '@/components/ui';
import { useOpenSales, useRecordPayment } from '@/features/money-api';
import { fromUnits, isPositiveDecimal, toUnits } from '@/lib/decimal';
import { colomboToday, formatIsoDate, formatRupees } from '@/lib/format';
import { colors, radius, space } from '@/theme/tokens';

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
  // Until the owner types an amount, offer the full balance of the chosen sales.
  const amountText = amountTouched ? amount : chosenTotal > 0n ? fromUnits(chosenTotal, 2) : '';
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
          reference: optional(reference),
          notes: null,
          allocations: [...parts.entries()].filter(([, v]) => v > 0n).map(([branchSaleId, v]) => ({ branchSaleId, amount: fromUnits(v, 2) })),
        },
        key: idem.key,
      },
      { onSuccess: () => router.back(), onError: idem.onError },
    );
  }

  return (
    <Screen
      title="Record payment"
      left={<TextLink title="Cancel" onPress={() => router.back()} />}
      footer={
        <View style={{ gap: 10 }}>
          {after !== null && amountUnits > 0n && !errors.amount ? (
            <Text variant="caption" style={{ textAlign: 'center' }}>
              {branchName} will owe {formatRupees(fromUnits(after, 2))}
            </Text>
          ) : null}
          <Button title="Record payment" onPress={save} loading={record.isPending} />
        </View>
      }>
      <FormError error={record.error} />
      <Card style={{ padding: space.lg, gap: space.lg }}>
        <SelectField
          label="Branch"
          value={branchId}
          onChange={pickBranch}
          options={list.map((b) => ({
            value: b.id,
            label: b.name,
            detail: owes(b.id) ? `owes ${formatRupees(owes(b.id)!)}` : undefined,
          }))}
          error={touched ? errors.branch : undefined}
        />
        <DecimalField
          label="Amount received (Rs)"
          value={amountText}
          onChangeText={(v) => {
            setAmountTouched(true);
            setAmount(v);
          }}
          placeholder="0.00"
          error={touched || amountTouched ? errors.amount : undefined}
        />
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
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Reference (optional)"
              value={reference}
              onChangeText={setReference}
              autoCapitalize="characters"
              placeholder={method === 'CHEQUE' ? 'Cheque no.' : method === 'BANK' ? 'Transfer ref.' : 'Receipt no.'}
            />
          </View>
          <View style={{ flex: 1 }}>
            <DateField label="Date" value={date} onChange={setDate} />
          </View>
        </View>
      </Card>

      {branchId ? (
        <View style={{ gap: space.sm }}>
          <SectionHeader title="Pays for" />
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
                        <Text>{formatIsoDate(s.saleDate)}</Text>
                        <Text variant="caption" numberOfLines={1}>
                          <Text variant="mono" style={{ fontSize: 12, color: colors.secondary }}>
                            {s.reference}
                          </Text>
                          {' · '}
                          {formatRupees(s.outstandingAmount)} left
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
            <Text variant="caption" style={{ paddingHorizontal: space.xs }}>
              {unallocated > 0n
                ? `${formatRupees(fromUnits(unallocated, 2))} more than the ticked sales owe`
                : amountUnits === chosenTotal
                  ? 'Allocated in full'
                  : 'Paid oldest sale first; the rest stays owed'}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}
