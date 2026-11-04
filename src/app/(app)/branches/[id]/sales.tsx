import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { branches, products } from '@/api/resources';
import type { Branch, BranchSale, BranchStock } from '@/api/types';
import { DateField } from '@/components/date-field';
import { FormError, optional, useIdempotencyKey } from '@/components/form';
import { DecimalField } from '@/components/money-field';
import { SelectField } from '@/components/pickers';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Button, Card, Field, IconButton, Notice, Separator } from '@/components/ui';
import { useBranchSales, useBranchStock, useRecordSale } from '@/features/branch-api';
import { useCurrentPriceGrid } from '@/features/prices-api';
import { divRound, formatKg, fromUnits, isDecimal, toFixedString, toUnits } from '@/lib/decimal';
import { colomboToday, formatRupees } from '@/lib/format';
import { colors, space } from '@/theme/tokens';

export default function DailySalesRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  const [branchId, setBranchId] = useState(params.id);
  const [date, setDate] = useState(colomboToday);
  const branchList = branches.useList('', true);
  const stock = useBranchStock(branchId);
  const existing = useBranchSales(branchId, date, date);
  if (!stock.data || !existing.data) {
    return (
      <Screen title="Daily sales" left={<IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />}>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }
  return (
    // Re-mount the form when the branch or day changes, so it starts from that day's record.
    <SalesForm
      key={`${branchId}|${date}`}
      branchId={branchId}
      date={date}
      stock={stock.data}
      existing={existing.data[0]}
      branchList={branchList.data?.content ?? []}
      setBranchId={setBranchId}
      setDate={setDate}
    />
  );
}

function SalesForm({
  branchId,
  date,
  stock,
  existing,
  branchList,
  setBranchId,
  setDate,
}: {
  branchId: string;
  date: string;
  stock: BranchStock[];
  existing: BranchSale | undefined;
  branchList: Branch[];
  setBranchId: (v: string) => void;
  setDate: (v: string) => void;
}) {
  const productList = products.useList('');
  const allProducts = productList.data?.content ?? [];
  const branchName = branchList.find((b) => b.id === branchId)?.name ?? 'branch';

  // What the branch can sell today: stock on hand plus anything already recorded for this day
  // (saving again replaces that day's record, so its weight is available again).
  const already = new Map((existing?.items ?? []).map((i) => [i.chickenTypeId, i.weightKg]));
  const sellable = new Map<string, bigint>();
  for (const s of stock) sellable.set(s.chickenTypeId, toUnits(s.availableWeightKg, 3));
  for (const [pid, kg] of already) sellable.set(pid, (sellable.get(pid) ?? 0n) + toUnits(kg, 3));
  const productIds = [...sellable.keys()].filter((pid) => (sellable.get(pid) ?? 0n) > 0n);
  const emptyProducts = allProducts.filter((p) => p.active && !productIds.includes(p.id));

  const prices = useCurrentPriceGrid(productIds, [branchId]);
  const price = (pid: string) => prices.get(pid, branchId)?.data?.sellingPricePerKg ?? null;

  const [sold, setSold] = useState<Record<string, string>>(() =>
    Object.fromEntries(productIds.map((pid) => [pid, already.get(pid) ? toFixedString(already.get(pid)!, 3) : ''])),
  );
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [touched, setTouched] = useState(false);
  const record = useRecordSale();
  const idem = useIdempotencyKey();

  const lineError = (pid: string) => {
    const v = sold[pid] ?? '';
    if (!v) return undefined;
    if (!isDecimal(v, 3)) return 'Enter kg';
    if (toUnits(v, 3) > (sellable.get(pid) ?? 0n)) return `Only ${formatKg(fromUnits(sellable.get(pid)!, 3))} in branch`;
    if (toUnits(v, 3) > 0n && !price(pid)) return 'No selling price set for this branch';
    return undefined;
  };
  const lines = productIds.filter((pid) => toUnits(sold[pid], 3) > 0n);
  const total = lines.reduce(
    (a, pid) => a + divRound(toUnits(sold[pid], 3) * toUnits(price(pid) ?? '0', 2), 1000n),
    0n,
  );
  const invalid = productIds.some((pid) => lineError(pid)) || lines.length === 0;

  function save() {
    setTouched(true);
    if (invalid) return;
    record.mutate(
      {
        input: {
          branchId,
          saleDate: date,
          notes: optional(notes),
          items: lines.map((pid) => ({ chickenTypeId: pid, weightKg: toFixedString(sold[pid]!, 3) })),
        },
        key: idem.key,
      },
      { onSuccess: () => router.back(), onError: idem.onError },
    );
  }

  return (
    <Screen
      title="Daily sales"
      left={<IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />}
      footer={<Button title={`Save ${branchName} sales`} onPress={save} loading={record.isPending} />}>
      <FormError error={record.error} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <SelectField
            label="Branch"
            value={branchId}
            onChange={setBranchId}
            options={branchList.map((b) => ({ value: b.id, label: b.name, detail: b.code }))}
          />
        </View>
        <View style={{ flex: 1 }}>
          <DateField label="Date" value={date} onChange={setDate} />
        </View>
      </View>

      {existing ? (
        <Notice text={`Sales for this day were saved already (${existing.reference}). Saving again replaces them.`} />
      ) : null}

      {productIds.map((pid) => {
        const p = price(pid);
        const kg = sold[pid] ?? '';
        const line = p && toUnits(kg, 3) > 0n ? divRound(toUnits(kg, 3) * toUnits(p, 2), 1000n) : null;
        return (
          <Card key={pid} style={{ padding: space.lg, gap: space.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="headline">
                {allProducts.find((x) => x.id === pid)?.name ?? 'Product'}
              </Text>
              <Text variant="caption">
                <Text variant="monoSmall">
                  {formatKg(fromUnits(sellable.get(pid)!, 3))}
                </Text>{' '}
                in branch
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <DecimalField
                  label="Sold (kg)"
                  accessibilityLabel={`Sold kg, ${allProducts.find((x) => x.id === pid)?.name ?? ''}`}
                  value={kg}
                  onChangeText={(v) => setSold((s) => ({ ...s, [pid]: v }))}
                  scale={3}
                  placeholder="0.000"
                  error={touched || kg ? lineError(pid) : undefined}
                />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text variant="caption">Price per kg</Text>
                <View style={{ height: 48, justifyContent: 'center' }}>
                  <Text variant="mono" style={{ color: p ? colors.ink : colors.warning }}>
                    {p ? formatRupees(p) : 'Not set'}
                  </Text>
                </View>
              </View>
            </View>
            {line !== null ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="caption">Line total</Text>
                <Text variant="monoSmall">
                  {formatRupees(fromUnits(line, 2))}
                </Text>
              </View>
            ) : null}
          </Card>
        );
      })}

      {emptyProducts.map((p) => (
        <Card key={p.id} style={{ padding: space.lg, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="headline" style={{ color: colors.secondary }}>
            {p.name}
          </Text>
          <Text variant="caption">No stock in branch</Text>
        </Card>
      ))}

      {productIds.length === 0 ? (
        <Notice text="This branch has no stock to sell. Confirm a delivery first." />
      ) : (
        <Card>
          <View style={{ minHeight: 48, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="bodyMedium">Sales</Text>
            <Text variant="mono">
              {formatRupees(fromUnits(total, 2))}
            </Text>
          </View>
          {existing ? (
            <>
              <Separator />
              <View style={{ paddingHorizontal: space.lg, paddingVertical: space.md, gap: 4 }}>
                <Text variant="caption">
                  Last saved: owed to head office {formatRupees(existing.transferValue)} · branch profit{' '}
                  {formatRupees(existing.branchProfit)}
                </Text>
              </View>
            </>
          ) : null}
        </Card>
      )}

      <Card style={{ padding: space.lg }}>
        <Field label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
      </Card>
    </Screen>
  );
}
