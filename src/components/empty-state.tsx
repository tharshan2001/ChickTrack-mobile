import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';

import { Appear } from '@/components/motion';
import { Text } from '@/components/text';
import { Card } from '@/components/ui';
import { colors, radius, space } from '@/theme/tokens';

type Tone = 'brand' | 'ok' | 'neutral';

const TONES: Record<Tone, { bg: string; fg: string }> = {
  brand: { bg: '#FBEDE3', fg: colors.accent },
  ok: { bg: '#E7F1EA', fg: colors.success },
  neutral: { bg: '#F2F2F4', fg: '#48484A' },
};

type Props = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  text?: string;
  tone?: Tone;
  /** Whole-tab version: a larger card for a tab with nothing in it yet. */
  full?: boolean;
};

export function EmptyState({ icon, title, text, tone = 'neutral', full }: Props) {
  const t = TONES[tone];
  const box = full ? 64 : 44;
  return (
    <Appear>
      <Card
        style={{
          borderWidth: 1,
          borderColor: 'rgba(162, 8, 12, 0.25)',
          borderRadius: radius.card,
          paddingVertical: full ? space.xl : space.lg,
          paddingHorizontal: 20,
          alignItems: 'center',
          gap: full ? space.sm : space.xs,
        }}>
        <View
          style={{
            width: box,
            height: box,
            borderRadius: full ? 20 : 14,
            backgroundColor: t.bg,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: space.xs,
          }}>
          <Feather name={icon} size={full ? 28 : 22} color={t.fg} />
        </View>
        <Text variant={full ? 'title' : 'headline'} style={{ textAlign: 'center', fontSize: full ? 20 : 16 }}>
          {title}
        </Text>
        {text ? (
          <Text variant="caption" style={{ textAlign: 'center', maxWidth: 280, lineHeight: 18 }}>
            {text}
          </Text>
        ) : null}
      </Card>
    </Appear>
  );
}
