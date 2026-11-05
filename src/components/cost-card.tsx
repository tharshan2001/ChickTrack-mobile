import Feather from '@expo/vector-icons/Feather';
import { randomUUID } from 'expo-crypto';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { expenseCategories } from '@/api/resources';
import { DecimalField } from '@/components/money-field';
import { SelectField } from '@/components/pickers';
import { Text } from '@/components/text';
import { Card, Field } from '@/components/ui';
import { isPositiveDecimal } from '@/lib/decimal';
import { colors, radius, space } from '@/theme/tokens';

/** An extra cost on a purchase or dispatch (transport, labour…), shared across lines by weight. */
export type Cost = { key: string; categoryId: string | null; description: string; amount: string };

export const newCost = (): Cost => ({ key: randomUUID(), categoryId: null, description: '', amount: '' });
export const costError = (c: Cost) => (isPositiveDecimal(c.amount) ? undefined : 'Enter the amount');

export function CostCard({
  cost,
  onChange,
  onRemove,
  showErrors,
  subtitle = 'Split across items by weight',
}: {
  cost: Cost;
  onChange: (change: Partial<Cost>) => void;
  onRemove: () => void;
  showErrors: boolean;
  subtitle?: string;
}) {
  const categories = expenseCategories.useList('', true);
  const [open, setOpen] = useState(!cost.categoryId && !cost.amount);
  const category = categories.data?.content.find((c) => c.id === cost.categoryId)?.name;
  const title = [category ?? 'Cost', cost.description.trim()].filter(Boolean).join(' · ');

  if (!open) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${title}`} onPress={() => setOpen(true)}>
        {({ pressed }) => (
          <Card
            style={{
              paddingVertical: 14,
              paddingHorizontal: space.lg,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: space.md,
              opacity: pressed ? 0.8 : 1,
            }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="headline">{title}</Text>
              <Text variant="caption">{subtitle}</Text>
            </View>
            <Text variant="mono">{cost.amount ? `Rs ${cost.amount}` : 'Rs —'}</Text>
          </Card>
        )}
      </Pressable>
    );
  }

  return (
    <Card style={{ padding: space.lg, gap: space.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Collapse cost"
          hitSlop={8}
          onPress={() => setOpen(false)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text variant="caption">Cost · shared across items by weight</Text>
          <Feather name="chevron-up" size={16} color={colors.secondary} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Remove cost" hitSlop={8} onPress={onRemove}>
          <Feather name="x" size={18} color={colors.secondary} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1.3 }}>
          <SelectField
            label="Category"
            value={cost.categoryId}
            onChange={(categoryId) => onChange({ categoryId })}
            placeholder="e.g. Transport"
            options={(categories.data?.content ?? []).map((x) => ({ value: x.id, label: x.name }))}
          />
        </View>
        <View style={{ flex: 1 }}>
          <DecimalField
            label="Amount Rs"
            value={cost.amount}
            onChangeText={(amount) => onChange({ amount })}
            placeholder="0.00"
            error={showErrors ? costError(cost) : undefined}
          />
        </View>
      </View>
      <Field
        label="Note (optional)"
        value={cost.description}
        onChangeText={(description) => onChange({ description })}
        placeholder="e.g. Lorry"
      />
    </Card>
  );
}

/** Full-width grey "+ Add …" button used under item and cost lists. */
export function AddRow({ title, onPress }: { title: string; onPress: () => void }) {
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
