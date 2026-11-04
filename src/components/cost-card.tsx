import Feather from '@expo/vector-icons/Feather';
import { randomUUID } from 'expo-crypto';
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
}: {
  cost: Cost;
  onChange: (change: Partial<Cost>) => void;
  onRemove: () => void;
  showErrors: boolean;
}) {
  const categories = expenseCategories.useList('', true);
  return (
    <Card style={{ padding: space.lg, gap: space.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="caption">Cost · shared across items by weight</Text>
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
