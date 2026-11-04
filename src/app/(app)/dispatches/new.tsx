import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { branches } from '@/api/resources';
import type { StockBatch } from '@/api/types';
import { AddRow, CostCard, costError, newCost, type Cost } from '@/components/cost-card';
import { DateField } from '@/components/date-field';
import { FormError, optional, useIdempotencyKey } from '@/components/form';
import { DecimalField } from '@/components/money-field';
import { SelectField } from '@/components/pickers';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Button, Card, Separator, TextLink } from '@/components/ui';
import { useCreateDistribution } from '@/features/distribution-api';
import { expensePerKg, previewLine } from '@/features/dispatch-math';
import { currentMargin, useMarginRulesFor } from '@/features/prices-api';
import { useOpenBatches } from '@/features/stock-api';
import { formatKg, formatPercent, fromUnits, isPositiveDecimal, toFixedString, toUnits } from '@/lib/decimal';
import { colomboToday, formatRupees } from '@/lib/format';
import { colors, space } from '@/theme/tokens';

type Line = { key: string; productId: string | null; kg: string };
const newLine = (): Line => ({ key: randomUUID(), productId: null, kg: '' });

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text variant={strong ? 'bodyMedium' : 'subhead'}>
        {label}
      </Text>
      <Text variant={strong ? 'mono' : 'monoSmall'}>
        {value}
      </Text>
    </View>
  );
}

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Colombo' }).format(new Date(iso));

export default function SendToBranch() {
  const branchList = branches.useList('', true);
  const batchesQuery = useOpenBatches();
  const [branchId, setBranchId] = useState<string | null>(null);
  const [date, setDate] = useState(colomboToday);
  const [lines, setLines] = useState<Line[]>(() => [newLine()]);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [touched, setTouched] = useState(false);
  const create = useCreateDistribution();
  const idem = useIdempotencyKey();

  // Free stock per product, oldest batch first.
  const byProduct = new Map<string, { name: string; batches: StockBatch[] }>();
  for (const b of batchesQuery.data ?? []) {
    if (toUnits(b.availableWeightKg, 3) <= 0n) continue;
    const entry = byProduct.get(b.chickenTypeId) ?? { name: b.chickenTypeName, batches: [] };
    entry.batches.push(b);
    byProduct.set(b.chickenTypeId, entry);
  }
  const productIds = [...byProduct.keys()];
  const marginRules = useMarginRulesFor(productIds);
  const markup = (productId: string) => {
    const rules = marginRules(productId)?.data;
    return (branchId ? currentMargin(rules, branchId) : null) ?? currentMargin(rules, null);
  };

  const previews = lines.map((l) =>
    l.productId
      ? previewLine(byProduct.get(l.productId)?.batches ?? [], l.kg, markup(l.productId)?.markupPercent ?? '0')
      : null,
  );
  const totalKg = lines.reduce((a, l) => a + toUnits(l.kg, 3), 0n);
  const expenses = costs.reduce((a, c) => a + toUnits(c.amount, 2), 0n);
  const deliveryPerKg = expensePerKg(expenses, totalKg);
  const cost = previews.reduce((a, p) => a + (p?.cost ?? 0n), 0n);
  const margin = previews.reduce((a, p) => a + (p?.margin ?? 0n), 0n);
  const owes = cost + margin + expenses;

  const lineErrors = (l: Line, i: number) => ({
    product: l.productId ? undefined : 'Choose a product',
    kg: !isPositiveDecimal(l.kg, 3)
      ? 'Enter the weight'
      : previews[i] && !previews[i]!.enough
        ? `Only ${formatKg(fromUnits(previews[i]!.freeKg, 3))} free`
        : undefined,
  });
  const branchError = branchId ? undefined : 'Choose a branch';
  const invalid =
    !!branchError ||
    lines.some((l, i) => Object.values(lineErrors(l, i)).some(Boolean)) ||
    costs.some((c) => costError(c)) ||
    new Set(lines.map((l) => l.productId)).size !== lines.length;

  const patch = (key: string, change: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...change } : l)));

  function save() {
    setTouched(true);
    if (invalid || !branchId) return;
    create.mutate(
      {
        input: {
          branchId,
          distributionDate: date,
          notes: null,
          items: lines.map((l) => ({ chickenTypeId: l.productId!, weightKg: toFixedString(l.kg, 3) })),
          expenses: costs.map((c) => ({
            categoryId: c.categoryId,
            description: optional(c.description),
            amount: toFixedString(c.amount),
            allocationMethod: 'BY_WEIGHT',
          })),
        },
        key: idem.key,
      },
      {
        onSuccess: (d) => router.replace({ pathname: '/dispatches/[id]', params: { id: d.id } }),
        onError: idem.onError,
      },
    );
  }

  const usedProducts = new Set(lines.map((l) => l.productId));

  return (
    <Screen
      title="Send to branch"
      left={<TextLink title="Cancel" onPress={() => router.back()} />}
      footer={
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View style={{ gap: 2 }}>
              <Text variant="caption">Branch will owe</Text>
              <Text variant="caption">Our margin {formatRupees(fromUnits(margin, 2))}</Text>
            </View>
            <Text variant="numTitle">{formatRupees(fromUnits(owes, 2))}</Text>
          </View>
          <Button
            title={totalKg > 0n ? `Save draft · holds ${formatKg(fromUnits(totalKg, 3))}` : 'Save draft'}
            onPress={save}
            loading={create.isPending}
          />
        </View>
      }>
      <FormError error={create.error} />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <SelectField
            label="Branch"
            value={branchId}
            onChange={setBranchId}
            options={(branchList.data?.content ?? []).map((b) => ({ value: b.id, label: b.name, detail: b.code }))}
            error={touched ? branchError : undefined}
          />
        </View>
        <View style={{ flex: 1 }}>
          <DateField label="Date" value={date} onChange={setDate} />
        </View>
      </View>

      {batchesQuery.isSuccess && productIds.length === 0 ? (
        <Card style={{ padding: space.xl, alignItems: 'center', gap: space.sm }}>
          <Text variant="bodyMedium">No free stock</Text>
          <Text variant="caption" style={{ textAlign: 'center' }}>
            Record a purchase first, or cancel a draft that is holding stock.
          </Text>
        </Card>
      ) : null}

      {lines.map((l, i) => {
        const p = previews[i];
        const errs = touched ? lineErrors(l, i) : ({} as ReturnType<typeof lineErrors>);
        const m = l.productId ? markup(l.productId) : null;
        const product = l.productId ? byProduct.get(l.productId) : undefined;
        const showMath = p && toUnits(l.kg, 3) > 0n && p.enough;
        return (
          <Card key={l.key} style={{ padding: space.lg, gap: space.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="caption">
                {product ? (
                  <>
                    <Text variant="monoSmall">
                      {formatKg(fromUnits(p!.freeKg, 3))}
                    </Text>{' '}
                    free
                  </>
                ) : (
                  `Item ${i + 1}`
                )}
              </Text>
              {lines.length > 1 ? (
                <TextLink title="Remove" onPress={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} />
              ) : null}
            </View>
            <SelectField
              label="Product"
              value={l.productId}
              onChange={(productId) => patch(l.key, { productId })}
              options={productIds
                .filter((id) => id === l.productId || !usedProducts.has(id))
                .map((id) => {
                  const e = byProduct.get(id)!;
                  const free = e.batches.reduce((a, b) => a + toUnits(b.availableWeightKg, 3), 0n);
                  return { value: id, label: e.name, detail: `${formatKg(fromUnits(free, 3))} free` };
                })}
              error={errs.product}
            />
            <DecimalField
              label="Weight to send (kg)"
              value={l.kg}
              onChangeText={(kg) => patch(l.key, { kg })}
              scale={3}
              placeholder="0.000"
              error={errs.kg}
            />
            {showMath ? (
              <View style={{ gap: 2 }}>
                <Row label="Landed cost" value={fromUnits(p.landedPerKg, 2)} />
                <Row
                  label={`Our margin · ${m ? formatPercent(m.markupPercent) : '0%'}`}
                  value={`+ ${fromUnits(p.marginPerKg, 2)}`}
                />
                {deliveryPerKg > 0n ? <Row label="Delivery cost" value={`+ ${fromUnits(deliveryPerKg, 2)}`} /> : null}
                <Separator />
                <Row
                  label="Transfer price / kg"
                  value={formatRupees(fromUnits(p.landedPerKg + p.marginPerKg + deliveryPerKg, 2))}
                  strong
                />
                <Text variant="caption" style={{ marginTop: 4 }}>
                  {p.batchCount > 1
                    ? `From ${p.batchCount} batches, oldest first.`
                    : `From the ${shortDate(p.oldestBatch!.receivedAt)} batch, oldest first.`}
                </Text>
              </View>
            ) : null}
          </Card>
        );
      })}

      {lines.length < productIds.length ? (
        <AddRow title="+ Add chicken type" onPress={() => setLines((ls) => [...ls, newLine()])} />
      ) : null}

      {costs.map((c) => (
        <CostCard
          key={c.key}
          cost={c}
          onChange={(change) => setCosts((cs) => cs.map((x) => (x.key === c.key ? { ...x, ...change } : x)))}
          onRemove={() => setCosts((cs) => cs.filter((x) => x.key !== c.key))}
          showErrors={touched}
        />
      ))}
      <AddRow title="+ Add delivery cost" onPress={() => setCosts((cs) => [...cs, newCost()])} />

      <Text variant="caption" style={{ color: colors.secondary, paddingHorizontal: space.xs }}>
        Saving holds the stock as a draft. Nothing leaves the warehouse until you dispatch it.
      </Text>
    </Screen>
  );
}
