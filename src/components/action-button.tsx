import Feather from '@expo/vector-icons/Feather';
import { Pressable } from 'react-native';

import { PlusIcon, TruckIcon } from '@/components/icons';
import { Text } from '@/components/text';
import { colors, radius, space } from '@/theme/tokens';

/** The pair of buttons under a summary card (Stock: Buy / Send, Money: Payment / Expense). */
export function ActionButton({
  icon,
  title,
  primary,
  onPress,
  disabled,
}: {
  icon: 'plus' | 'truck' | 'receipt';
  title: string;
  primary?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const fg = primary ? colors.surface : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 44,
        paddingVertical: 6,
        paddingHorizontal: space.sm,
        borderRadius: radius.field,
        backgroundColor: primary ? (pressed ? colors.accentPressed : colors.accent) : colors.field,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.sm,
        opacity: disabled ? 0.45 : 1,
      })}>
      {icon === 'plus' ? (
        <PlusIcon size={18} color={fg} />
      ) : icon === 'truck' ? (
        <TruckIcon size={18} color={fg} strokeWidth={1.8} />
      ) : (
        <Feather name="file-text" size={17} color={fg} />
      )}
      <Text variant="bodyMedium" style={{ color: fg, letterSpacing: 0.5, flexShrink: 1, textAlign: 'center' }}>
        {title}
      </Text>
    </Pressable>
  );
}
