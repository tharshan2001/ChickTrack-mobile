import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { branches, products } from '@/api/resources';
import type { Branch, BranchSale, BranchStock } from '@/api/types';
import { DateField } from '@/components/date-field';
import { FormError, optional, useIdempotencyKey } from '@/components/form';
import { DecimalField } from '@/components/money-field';
import { CountText, savedAndBack } from '@/components/motion';
import { SelectField } from '@/components/pickers';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Badge, Button, Card, Field, IconButton, Notice, Separator } from '@/components/ui';
import { useBranchSales, useBranchStock, useRecordSale } from '@/features/branch-api';
import { useCurrentPriceGrid } from '@/features/prices-api';
import { divRound, formatKg, fromUnits, isDecimal, toFixedString, toUnits } from '@/lib/decimal';
import { addDays, colomboToday, formatIsoDate, formatRupees } from '@/lib/format';
import { colors, radius, space } from '@/theme/tokens';

/**
 * Day close: the branch counts the stock it has left of each product and enters what it took in.
 * Sold kg = opening - closing; expected = sold kg x branch price; short/over = takings - expected.
 */
export default function DailyCloseRoute() {
  const params = useLocalSearchParams<{ id: string; date?: string }>();
  const [branchId, setBranchId] = useState(params.id);
  const [date, setDate] = useState(() => params.date ?? colomboToday());
  const branchList = branches.useList('', true);
  const opening = useBranchStock(branchId, date);
  const existing = useBranchSales(branchId, date, date);
  const later = useBranchSales(branchId, addDays(date, 1), '9999-12-31');
  if (!opening.data || !existing.data || !later.data) {
    return (
      <Screen title="Daily close" left={<IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />}>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }
  return (
    // Re-mount the form when the branch or day changes, so it starts from that day's record.
    <CloseForm
      key={`${branchId}|${date}`}
      branchId={branchId}
      date={date}
      opening={opening.data}
      existing={existing.data[0]}
      laterDay={later.data[later.data.length - 1]?.saleDate}
      branchList={branchList.data?.content ?? []}
      setBranchId={setBranchId}
      setDate={setDate}
    />
  );
}

function CloseForm({
  branchId,
  date,
  opening,
  existing,
  laterDay,
  branchList,
  setBranchId,
  setDate,
}: {
  branchId: string;
  date: string;
  opening: BranchStock[];
  existing: BranchSale | undefined;
  laterDay: string | undefined;
  branchList: Branch[];
  setBranchId: (v: string) => void;
  setDate: (v: string) => void;
}) {
  const productList = products.useList('');
  const allProducts = productList.data?.content ?? [];
  const name = (pid: string) => allProducts.find((x) => x.id === pid)?.name ?? 'Product';
  const branchName = branchList.find((b) => b.id === branchId)?.name ?? 'branch';
  const locked = !!laterDay;

  const openingKg = new Map(opening.map((s) => [s.chickenTypeId, toUnits(s.availableWeightKg, 3)]));
  const productIds = [...openingKg.keys()].filter((pid) => (openingKg.get(pid) ?? 0n) > 0n);
  const emptyProducts = allProducts.filter((p) => p.active && !productIds.includes(p.id));

  const prices = useCurrentPriceGrid(productIds, [branchId]);
  const price = (pid: string) => prices.get(pid, branchId)?.data?.sellingPricePerKg ?? null;

  const saved = new Map((existing?.items ?? []).map((i) => [i.chickenTypeId, i.closingWeightKg]));
  const [closing, setClosing] = useState<Record<string, string>>(() =>
    Object.fromEntries(productIds.map((pid) => [pid, saved.has(pid) ? toFixedString(saved.get(pid)!, 3) : ''])),
  );
  const [takings, setTakings] = useState(existing ? toFixedString(existing.totalSales, 2) : '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [touched, setTouched] = useState(false);
  const record = useRecordSale();
  const idem = useIdempotencyKey();

  const soldKg = (pid: string) => {
    const v = closing[pid] ?? '';
    if (!v || !isDecimal(v, 3)) return null;
    const sold = (openingKg.get(pid) ?? 0n) - toUnits(v, 3);
    return sold >= 0n ? sold : null;
  };
  const lineError = (pid: string) => {
    const v = closing[pid] ?? '';
    if (!v) return 'Count what is left';
    if (!isDecimal(v, 3)) return 'Enter kg';
    if (toUnits(v, 3) > (openingKg.get(pid) ?? 0n)) return `More than the ${formatKg(fromUnits(openingKg.get(pid)!, 3))} held`;
    return undefined;
  };
  const takingsError = !takings ? 'Enter today’s takings' : !isDecimal(takings, 2) ? 'Enter an amount' : undefined;

  // Expected only when every sold product has a price; otherwise short/over is unknown.
  let expected: bigint | null = 0n;
  for (const pid of productIds) {
    const sold = soldKg(pid);
    if (sold === null || sold === 0n) continue;
    const p = price(pid);
    if (!p) {
      expected = null;
      break;
    }
    expected = (expected ?? 0n) + divRound(sold * toUnits(p, 2), 1000n);
  }
  const actual = takings && isDecimal(takings, 2) ? toUnits(takings, 2) : null;
  const allCounted = productIds.every((pid) => soldKg(pid) !== null);
  const variance = expected !== null && actual !== null && allCounted ? actual - expected : null;
  const invalid = locked || productIds.length === 0 || productIds.some((pid) => lineError(pid)) || !!takingsError;

  function save() {
    setTouched(true);
    if (invalid) return;
    record.mutate(
      {
        input: {
          branchId,
          saleDate: date,
          totalSales: toFixedString(takings, 2),
          notes: optional(notes),
          items: productIds.map((pid) => ({ chickenTypeId: pid, closingWeightKg: toFixedString(closing[pid]!, 3) })),
        },
        key: idem.key,
      },
      { onSuccess: () => savedAndBack('Day closed'), onError: idem.onError },
    );
  }

  return (
    <Screen
      title="Daily close"
      left={<IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />}
      bodyGap={12}
      headerExtra={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <SelectField
              label="Branch"
              compact
              value={branchId}
              onChange={setBranchId}
              options={branchList.map((b) => ({ value: b.id, label: b.name, detail: b.code }))}
            />
          </View>
          <View style={{ flex: 1 }}>
            <DateField label="Date" value={date} onChange={setDate} compact />
          </View>
        </View>
      }
      footer={
        locked ? undefined : <Button title={`Save ${branchName} close`} onPress={save} loading={record.isPending} />
      }>
      <FormError error={record.error} />

      {locked ? (
        <Notice text={`${formatIsoDate(laterDay!)} is already closed, so this day can’t be changed.`} />
      ) : existing ? (
        <Notice text={`This day was closed already (${existing.reference}). Saving again replaces it.`} />
      ) : (
        <Notice icon={false} text="Count what is left of each product, then enter today’s takings." />
      )}

      {productIds.map((pid) => {
        const sold = soldKg(pid);
        const v = closing[pid] ?? '';
        return (
          <Card key={pid} style={{ padding: space.lg, gap: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text variant="headline">{name(pid)}</Text>
              <Text variant="caption">
                Opening <Text variant="monoSmall">{formatKg(fromUnits(openingKg.get(pid)!, 3))}</Text>
              </Text>
            </View>
            <DecimalField
              label="Closing stock (kg)"
              accessibilityLabel={`Closing stock kg, ${name(pid)}`}
              value={v}
              onChangeText={(t) => setClosing((s) => ({ ...s, [pid]: t }))}
              scale={3}
              placeholder="0.000"
              mid
              editable={!locked}
              error={touched || v ? lineError(pid) : undefined}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="caption">Sold</Text>
              <Text variant="monoSmall">{sold !== null ? formatKg(fromUnits(sold, 3)) : '—'}</Text>
            </View>
            {!price(pid) && sold !== null && sold > 0n ? (
              <Text variant="caption" style={{ color: colors.warning }}>
                No branch price set, so expected sales can’t be worked out
              </Text>
            ) : null}
          </Card>
        );
      })}

      {emptyProducts.map((p) => (
        <Card
          key={p.id}
          style={{ paddingVertical: 14, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ gap: 2 }}>
            <Text variant="headline" style={{ color: colors.secondary }}>
              {p.name}
            </Text>
            <Text variant="caption">No stock in branch</Text>
          </View>
          <Badge label="Empty" tone="neutral" />
        </Card>
      ))}

      {productIds.length === 0 ? (
        <Notice text="This branch had no stock on this day. Confirm a delivery first." />
      ) : (
        <>
          <Card style={{ padding: space.lg, gap: 8, borderWidth: 1.5, borderColor: colors.tint }}>
            <DecimalField
              label="Total sales today (Rs)"
              accessibilityLabel="Total sales today in rupees"
              value={takings}
              onChangeText={setTakings}
              scale={2}
              placeholder="0.00"
              large
              editable={!locked}
              error={touched || takings ? takingsError : undefined}
            />
          </Card>

          <View style={{ backgroundColor: colors.field, borderRadius: radius.card, padding: space.lg, gap: 10 }}>
            <Row label="Expected at branch price" value={expected !== null && allCounted ? fromUnits(expected, 2) : null} />
            <Row label="Actual" value={actual !== null ? fromUnits(actual, 2) : null} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="body" style={{ color: colors.secondary }}>
                Short / over
              </Text>
              {variance === null ? (
                <Text variant="mono">—</Text>
              ) : (
                <View
                  style={{
                    backgroundColor: variance < 0n ? colors.dangerBg : colors.successBg,
                    borderRadius: radius.pill,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                  }}>
                  <Text variant="mono" style={{ color: variance < 0n ? colors.danger : colors.success }}>
                    {variance < 0n ? '− ' : '+ '}
                    {formatRupees(fromUnits(variance < 0n ? -variance : variance, 2))}
                  </Text>
                </View>
              )}
            </View>
            <Separator inset={0} />
            {/* Cost is taken from the oldest stock on the server, so it is known once the day is saved. */}
            <Row label="Cost of stock sold" value={existing ? existing.transferValue : null} hint="After saving" />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text variant="headline">Branch profit</Text>
              {existing ? (
                <CountText
                  variant="numLarge"
                  style={{ color: existing.branchProfit.startsWith('-') ? colors.danger : colors.success }}
                  value={existing.branchProfit}
                  format={formatRupees}
                />
              ) : (
                <Text variant="numLarge" style={{ color: colors.secondary }}>
                  —
                </Text>
              )}
            </View>
          </View>
        </>
      )}

      <Card style={{ padding: space.lg }}>
        <Field label="Notes (optional)" value={notes} onChangeText={setNotes} multiline editable={!locked} />
      </Card>
    </Screen>
  );
}

function Row({ label, value, hint }: { label: string; value: string | null; hint?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <Text variant="body" style={{ color: colors.secondary }}>
        {label}
      </Text>
      {value !== null ? (
        <Text variant="mono">{formatRupees(value)}</Text>
      ) : (
        <Text variant="caption">{hint ?? '—'}</Text>
      )}
    </View>
  );
}
