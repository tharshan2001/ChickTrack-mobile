import { Feather } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/text';
import { colors } from '@/theme/tokens';

export function shiftMonth(isoMonth: string, by: number) {
  const [y, m] = isoMonth.split('-').map(Number);
  const d = new Date(Date.UTC(y!, m! - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

export function monthRange(isoMonth: string) {
  const [y, m] = isoMonth.split('-').map(Number);
  const last = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  return { from: `${isoMonth}-01`, to: `${isoMonth}-${String(last).padStart(2, '0')}` };
}

export function MonthStepper({
  label,
  onPrevious,
  onNext,
  previousLabel = 'Previous',
  nextLabel = 'Next',
}: {
  label: string;
  onPrevious: () => void;
  onNext?: () => void;
  previousLabel?: string;
  nextLabel?: string;
}) {
  const arrow = (icon: 'chevron-left' | 'chevron-right', a11y: string, onPress?: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: !onPress }}
      disabled={!onPress}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <Feather name={icon} size={20} color={onPress ? colors.accent : colors.separator} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {arrow('chevron-left', previousLabel, onPrevious)}
      <Text variant="bodyMedium" style={{ minWidth: 120, textAlign: 'center' }}>
        {label}
      </Text>
      {arrow('chevron-right', nextLabel, onNext)}
    </View>
  );
}
