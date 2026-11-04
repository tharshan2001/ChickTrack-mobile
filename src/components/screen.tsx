import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { colors, space } from '@/theme/tokens';

type ScreenProps = {
  title: string;
  subtitle?: string;
  /** Left side of the top bar: a back icon or a "Cancel" link. */
  left?: ReactNode;
  /** Right side of the top bar: usually an add button. */
  right?: ReactNode;
  /** Pinned to the bottom, above the safe area (e.g. a Save button). */
  footer?: ReactNode;
  /** Set false when the body is its own list (FlatList). */
  scroll?: boolean;
  children: ReactNode;
};

/** Page shell matching the mockups: top bar, large title, padded body, optional pinned footer. */
export function Screen({ title, subtitle, left, right, footer, scroll = true, children }: ScreenProps) {
  const hasBar = !!(left || right);
  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl }}>
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1 }}>{children}</View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {hasBar ? (
          <View
            style={{
              minHeight: 44,
              paddingHorizontal: space.sm,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <View>{left}</View>
            <View style={{ marginRight: space.sm }}>{right}</View>
          </View>
        ) : null}
        <View style={{ paddingHorizontal: space.lg, paddingTop: hasBar ? 0 : space.lg, gap: 2 }}>
          <Text variant="largeTitle" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text variant="caption">{subtitle}</Text> : null}
        </View>
        {body}
        {footer ? (
          <SafeAreaView
            edges={['bottom']}
            style={{
              paddingHorizontal: space.lg,
              paddingTop: space.md,
              paddingBottom: space.md,
              backgroundColor: colors.surface,
              boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.06)',
            }}>
            {footer}
          </SafeAreaView>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
