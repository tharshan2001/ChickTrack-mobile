import Feather from '@expo/vector-icons/Feather';
import { useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { expenseCategories, products, suppliers } from '@/api/resources';
import type { CommissionMethod } from '@/api/types';
import { DateField } from '@/components/date-field';
import { FormError, optional, useIdempotencyKey } from '@/components/form';
import { DecimalField } from '@/components/money-field';
import { Segmented, SelectField } from '@/components/pickers';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Badge, Button, Card, Field, TextLink } from '@/components/ui';
import { currentPriceQuery } from '@/features/prices-api';
import { COMMISSION_OPTIONS, previewPurchase, type ItemDraft } from '@/features/purchase-math';
import { useCreateProcurement } from '@/features/stock-api';
import { formatKg, fromUnits, isDecimal, isPositiveDecimal, toFixedString } from '@/lib/decimal';
import { formatRupees, toIsoDate } from '@/lib/format';
import { colors, radius, space } from '@/theme/tokens';

type Item = ItemDraft & { key: string; productId: string | null };
type Cost = { key: string; categoryId: string | null; description: string; amount: string };

const newItem = (): Item => ({
  key: randomUUID(),
  productId: null,
  kg: '',
  price: '',
  birds: '',
  method: 'PER_KG',
  commission: '',
});
const newCost = (): Cost => ({ key: randomUUID(), categoryId: null, description: '', amount: '' });

function itemErrors(it: Item) {
  return {
    product: it.productId ? undefined : 'Choose a product',
    kg: isPositiveDecimal(it.kg, 3) ? undefined : 'Enter kg',
    price: isDecimal(it.price) ? undefined : 'Enter Rs / kg',
    birds: it.birds && !/^\d{1,7}$/.test(it.birds) ? 'Whole number' : it.method === 'PER_BIRD' && !it.birds ? 'Needed for per-bird' : undefined,
    commission: it.commission && !isDecimal(it.commission) ? 'Enter an amount' : undefined,
  };
}

export default function NewPurchase() {
  const qc = useQueryClient();
  const supplierList = suppliers.useList('', true);
  const productList = products.useList('', true);
  const categoryList = expenseCategories.useList('', true);
  const productName = (id: string | null) => productList.data?.content.find((p) => p.id === id)?.name ?? 'Product';

  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [date, setDate] = useState(() => toIsoDate(new Date()));
  const [items, setItems] = useState<Item[]>(() => [newItem()]);
  const [open, setOpen] = useState(items[0]!.key);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [notes, setNotes] = useState('');
  const [touched, setTouched] = useState(false);

  const create = useCreateProcurement();
  const idem = useIdempotencyKey();
  const preview = previewPurchase(
    items,
    costs.map((c) => c.amount),
  );

  const patch = (key: string, change: Partial<Item>) =>
    setItems((list) => list.map((it) => (it.key === key ? { ...it, ...change } : it)));
  const patchCost = (key: string, change: Partial<Cost>) =>
    setCosts((list) => list.map((c) => (c.key === key ? { ...c, ...change } : c)));

  async function chooseProduct(key: string, productId: string) {
    patch(key, { productId });
    // Prefill the buying price from Prices & margins if the owner hasn't typed one.
    const current = await qc.fetchQuery(currentPriceQuery(productId, null)).catch(() => null);
    if (current) {
      setItems((list) =>
        list.map((it) => (it.key === key && !it.price ? { ...it, price: toFixedString(current.purchasePricePerKg) } : it)),
      );
    }
  }

  const supplierError = supplierId ? undefined : 'Choose a supplier';
  const dateError = /^\d{4}-\d{2}-\d{2}$/.test(date) ? undefined : 'Enter a date as yyyy-mm-dd';
  const costErrors = (c: Cost) => (isPositiveDecimal(c.amount) ? undefined : 'Enter the amount');
  const invalid =
    !!supplierError ||
    !!dateError ||
    items.some((it) => Object.values(itemErrors(it)).some(Boolean)) ||
    costs.some((c) => costErrors(c));

  function save() {
    setTouched(true);
    const firstBad = items.find((it) => Object.values(itemErrors(it)).some(Boolean));
    if (firstBad) setOpen(firstBad.key);
    if (invalid || !supplierId) return;
    create.mutate(
      {
        input: {
          supplierId,
          procurementDate: date,
          notes: optional(notes),
          items: items.map((it) => ({
            chickenTypeId: it.productId!,
            paidWeightKg: toFixedString(it.kg, 3),
            purchasePricePerKg: toFixedString(it.price),
            commissionMethod: it.method,
            commissionValue: toFixedString(it.commission || '0'),
            quantity: it.birds ? Number.parseInt(it.birds, 10) : null,
          })),
          expenses: costs.map((c) => ({
            categoryId: c.categoryId,
            description: optional(c.description),
            amount: toFixedString(c.amount),
          })),
        },
        key: idem.key,
      },
      { onSuccess: () => router.back(), onError: idem.onError },
    );
  }

  return (
    <Screen
      title="New purchase"
      left={<TextLink title="Cancel" onPress={() => router.back()} />}
      footer={
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text variant="caption">Total cost · {formatKg(preview.totalKg)}</Text>
            <Text variant="monoLarge">{formatRupees(preview.total)}</Text>
          </View>
          <Button title="Save purchase" onPress={save} loading={create.isPending} />
        </View>
      }>
      <FormError error={create.error} />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <SelectField
            label="Supplier"
            value={supplierId}
            onChange={setSupplierId}
            options={(supplierList.data?.content ?? []).map((s) => ({
              value: s.id,
              label: s.name,
              detail: s.paymentTerms ?? undefined,
            }))}
            error={touched ? supplierError : undefined}
          />
        </View>
        <View style={{ flex: 1 }}>
          <DateField label="Date" value={date} onChange={setDate} />
        </View>
      </View>

      {items.map((it, i) => {
        const p = preview.items[i]!;
        const landed = p.landedPerKg !== null && p.purchase > 0n ? `${formatRupees(fromUnits(p.landedPerKg, 2))}/kg` : null;
        if (it.key !== open) {
          return (
            <Pressable key={it.key} accessibilityRole="button" onPress={() => setOpen(it.key)}>
              <Card style={{ padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyMedium" style={{ fontSize: 16 }}>
                    {productName(it.productId)}
                  </Text>
                  <Text variant="caption">
                    {it.kg ? formatKg(it.kg) : '— kg'} × {it.price ? formatRupees(it.price) : 'Rs —'}
                    {p.commission > 0n ? ` · commission ${formatRupees(fromUnits(p.commission, 2))}` : ' · no commission'}
                  </Text>
                </View>
                {landed ? (
                  <Text variant="mono" style={{ fontSize: 13, color: colors.success }}>
                    {landed}
                  </Text>
                ) : null}
              </Card>
            </Pressable>
          );
        }
        const errs = touched ? itemErrors(it) : ({} as ReturnType<typeof itemErrors>);
        const unit = COMMISSION_OPTIONS.find((o) => o.value === it.method)!.unit;
        return (
          <Card key={it.key} style={{ padding: space.lg, gap: space.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="caption">Item {i + 1}</Text>
              <View style={{ flexDirection: 'row', gap: space.lg }}>
                <TextLink title="Manage products" onPress={() => router.push('/products')} />
                {items.length > 1 ? (
                  <TextLink
                    title="Remove"
                    onPress={() => {
                      const rest = items.filter((x) => x.key !== it.key);
                      setItems(rest);
                      setOpen(rest[0]!.key);
                    }}
                  />
                ) : null}
              </View>
            </View>
            <SelectField
              label="Product"
              value={it.productId}
              onChange={(v) => chooseProduct(it.key, v)}
              options={(productList.data?.content ?? []).map((x) => ({ value: x.id, label: x.name }))}
              error={errs.product}
            />
            {landed ? (
              <View style={{ alignItems: 'flex-start' }}>
                <Badge label={`${landed} landed`} tone="success" />
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <View style={{ flex: 1 }}>
                <DecimalField label="Paid kg" value={it.kg} onChangeText={(kg) => patch(it.key, { kg })} scale={3} placeholder="0.000" error={errs.kg} />
              </View>
              <View style={{ flex: 1 }}>
                <DecimalField label="Rs / kg" value={it.price} onChangeText={(price) => patch(it.key, { price })} placeholder="0.00" error={errs.price} />
              </View>
              <View style={{ flex: 0.8 }}>
                <Field
                  label="Birds"
                  value={it.birds}
                  onChangeText={(birds) => /^\d{0,7}$/.test(birds) && patch(it.key, { birds })}
                  inputMode="numeric"
                  keyboardType="number-pad"
                  placeholder="0"
                  error={errs.birds}
                />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Segmented
                  label="Commission"
                  value={it.method}
                  onChange={(method: CommissionMethod) => patch(it.key, { method })}
                  options={COMMISSION_OPTIONS}
                />
              </View>
              <View style={{ width: 88 }}>
                <DecimalField
                  label={unit}
                  accessibilityLabel={`Commission, ${unit}`}
                  value={it.commission}
                  onChangeText={(commission) => patch(it.key, { commission })}
                  placeholder="0.00"
                  error={errs.commission}
                />
              </View>
            </View>
          </Card>
        );
      })}

      <AddRow
        title="+ Add chicken type"
        onPress={() => {
          const n = newItem();
          setItems((list) => [...list, n]);
          setOpen(n.key);
        }}
      />

      {costs.map((c) => (
        <Card key={c.key} style={{ padding: space.lg, gap: space.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="caption">Cost · shared across items by weight</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove cost"
              hitSlop={8}
              onPress={() => setCosts((list) => list.filter((x) => x.key !== c.key))}>
              <Feather name="x" size={18} color={colors.secondary} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1.3 }}>
              <SelectField
                label="Category"
                value={c.categoryId}
                onChange={(categoryId) => patchCost(c.key, { categoryId })}
                placeholder="e.g. Transport"
                options={(categoryList.data?.content ?? []).map((x) => ({ value: x.id, label: x.name }))}
              />
            </View>
            <View style={{ flex: 1 }}>
              <DecimalField
                label="Amount Rs"
                value={c.amount}
                onChangeText={(amount) => patchCost(c.key, { amount })}
                placeholder="0.00"
                error={touched ? costErrors(c) : undefined}
              />
            </View>
          </View>
          <Field
            label="Note (optional)"
            value={c.description}
            onChangeText={(description) => patchCost(c.key, { description })}
            placeholder="e.g. Lorry"
          />
        </Card>
      ))}

      <AddRow title="+ Add cost (transport, labour…)" onPress={() => setCosts((list) => [...list, newCost()])} />

      <Field label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
    </Screen>
  );
}

function AddRow({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        height: 44,
        borderRadius: radius.field,
        backgroundColor: colors.field,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}>
      <Text variant="bodyMedium" style={{ color: colors.accent, letterSpacing: 0.5 }}>
        {title}
      </Text>
    </Pressable>
  );
}
