import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import type { OperatingExpense, OperatingExpenseInput } from '@/api/types';
import { branches, expenseCategories } from '@/api/resources';
import { DateField } from '@/components/date-field';
import { FormError, fieldErrors, optional, useFormValues, useIdempotencyKey } from '@/components/form';
import { DecimalField } from '@/components/money-field';
import { Chips, Segmented, SelectField } from '@/components/pickers';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Button, Card, Field, TextLink } from '@/components/ui';
import { colomboToday, formatRupees } from '@/lib/format';
import { isPositiveDecimal, toFixedString } from '@/lib/decimal';
import { colors, space } from '@/theme/tokens';

type Save = {
  mutate: (
    vars: { input: OperatingExpenseInput; key: string },
    opts: { onError: (e: unknown) => void; onSuccess: (e: OperatingExpense) => void },
  ) => void;
  isPending: boolean;
  error: unknown;
};

export function ExpenseForm({
  title,
  submitTitle,
  initial,
  save,
  onSaved,
}: {
  title: string;
  submitTitle: string;
  initial?: OperatingExpense;
  save: Save;
  onSaved: (e: OperatingExpense) => void;
}) {
  const form = useFormValues({
    amount: initial?.amount ?? '',
    payee: initial?.payee ?? '',
    note: initial?.description ?? '',
  });
  const [date, setDate] = useState(initial?.expenseDate ?? colomboToday());
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [where, setWhere] = useState<'office' | 'branch'>(initial && !initial.branchId ? 'office' : 'branch');
  const [branchId, setBranchId] = useState<string | null>(initial?.branchId ?? null);
  const categories = expenseCategories.useList('');
  const branchList = branches.useList('', true);
  const idem = useIdempotencyKey();
  const server = fieldErrors(save.error);
  const v = form.values;

  const categoryOptions = (categories.data?.content ?? [])
    .filter((c) => c.active || c.id === initial?.categoryId)
    .map((c) => ({ value: c.id, label: c.name }));

  const errors = {
    amount: !isPositiveDecimal(v.amount) ? 'Enter an amount above zero' : server.amount,
    category: !categoryId ? 'Choose a category' : server.categoryId,
    branch: where === 'branch' && !branchId ? 'Choose a branch' : server.branchId,
    date: date > colomboToday() ? "Can't be in the future" : server.expenseDate,
  };
  const show = (e: string | undefined) => (form.touched ? e : undefined);

  function submit() {
    form.setTouched(true);
    if (errors.amount || errors.category || errors.branch || errors.date) return;
    save.mutate(
      {
        key: idem.key,
        input: {
          expenseDate: date,
          categoryId: categoryId!,
          branchId: where === 'branch' ? branchId : null,
          amount: toFixedString(v.amount),
          payee: optional(v.payee),
          description: optional(v.note),
        },
      },
      { onError: idem.onError, onSuccess: onSaved },
    );
  }

  return (
    <Screen
      title={title}
      subtitle={
        initial ? (
          <Text variant="monoSmall" style={{ letterSpacing: 0.5 }}>
            {initial.reference}
          </Text>
        ) : undefined
      }
      titleGap={space.xs}
      bodyGap={14}
      left={<TextLink title="Cancel" onPress={() => router.back()} />}
      footerShadow
      footer={<Button title={submitTitle} onPress={submit} loading={save.isPending} />}>
      <FormError error={save.error} />
      <Card style={{ padding: space.lg, gap: space.md }}>
        <DecimalField
          label="Amount (Rs)"
          value={v.amount}
          onChangeText={form.set('amount')}
          error={show(errors.amount)}
          hint={initial && v.amount !== initial.amount ? `Was ${formatRupees(initial.amount).replace('Rs ', '')}` : undefined}
          placeholder="0.00"
          huge
          autoFocus={!initial}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <DateField label="Date" value={date} onChange={setDate} compact />
            {show(errors.date) ? (
              <Text variant="caption" style={{ color: colors.danger }}>
                {errors.date}
              </Text>
            ) : null}
          </View>
          <View style={{ flex: 1 }}>
            <SelectField
              label="Category"
              value={categoryId}
              onChange={setCategoryId}
              options={categoryOptions}
              error={show(errors.category)}
              compact
            />
          </View>
        </View>
      </Card>

      <Card style={{ padding: space.lg, gap: space.md }}>
        <Segmented
          label="Charged to"
          value={where}
          onChange={setWhere}
          options={[
            { value: 'office', label: 'Head office' },
            { value: 'branch', label: 'A branch' },
          ]}
        />
        {where === 'branch' ? (
          <Chips
            label="Branch"
            value={branchId}
            onChange={setBranchId}
            error={show(errors.branch)}
            options={(branchList.data?.content ?? []).map((b) => ({ value: b.id, label: b.name }))}
          />
        ) : null}
      </Card>

      <Card style={{ padding: space.lg, gap: space.md }}>
        <Field label="Paid to (optional)" value={v.payee} onChangeText={form.set('payee')} error={server.payee} />
        <Field label="Note (optional)" value={v.note} onChangeText={form.set('note')} error={server.description} />
      </Card>
      <Text variant="caption" style={{ paddingHorizontal: space.xs, lineHeight: 19 }}>
        Expenses lower net profit in Profit &amp; loss. Transport and ice on a purchase or a dispatch stay on that document.
      </Text>
    </Screen>
  );
}
