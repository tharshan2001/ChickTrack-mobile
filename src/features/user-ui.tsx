import { View } from 'react-native';

import { Text } from '@/components/text';
import { colors, fonts } from '@/theme/tokens';

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function Avatar({ name, me, size = 40 }: { name: string; me?: boolean; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: me ? colors.tint : colors.field,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontFamily: fonts.title, fontSize: size * 0.38, color: me ? colors.accentPressed : colors.ink }}>
        {initials(name)}
      </Text>
    </View>
  );
}
