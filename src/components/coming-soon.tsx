import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';

import { Text } from '@/components/text';
import { Card } from '@/components/ui';
import { colors, space } from '@/theme/tokens';

/** Placeholder for tabs whose screens are designed but not built yet. */
export function ComingSoon({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  return (
    <Card style={{ padding: space.xl, alignItems: 'center', gap: space.md }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.tint,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Feather name={icon} size={22} color={colors.accentPressed} />
      </View>
      <Text variant="caption" style={{ textAlign: 'center' }}>
        {text}
      </Text>
    </Card>
  );
}
