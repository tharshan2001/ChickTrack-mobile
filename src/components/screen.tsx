import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text, type Variant } from '@/components/text';
import { colors, space } from '@/theme/tokens';

const refreshListeners = new Set<() => void>();

/** Run `fn` each time the person pulls down to refresh (e.g. the Home mascot reacts). */
export function onPullRefresh(fn: () => void) {
  refreshListeners.add(fn);
  return () => {
    refreshListeners.delete(fn);
  };
}

/** Pull down on any screen to reload everything it shows from the server. */
function usePullToRefresh() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    refreshListeners.forEach((fn) => fn());
    try {
      await qc.refetchQueries({ type: 'active' });
    } finally {
      setRefreshing(false);
    }
  };
  return <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />;
}

type ScreenProps = {
  title: string;
  subtitle?: ReactNode;
  /** Type style for the title. Dispatch references use the mono title. */
  titleVariant?: Variant;
  /** Left side of the top bar: a back icon or a "Cancel" link. */
  left?: ReactNode;
  /** Right side of the top bar: usually an add button. */
  right?: ReactNode;
  /** Pinned to the bottom, above the safe area (e.g. a Save button). */
  footer?: ReactNode;
  /** Set false when the body is its own list (FlatList). */
  scroll?: boolean;
  /**
   * Put the actions on the same row as the large title, as Branches and Stock do
   * in the mockups. Off by default, which is the Products/Purchases pattern: a
   * bar of actions above, title below.
   */
  inlineActions?: boolean;
  /** Show the subtitle above the title, as Home does in the mockups. */
  subtitleAbove?: boolean;
  hideTitle?: boolean;
  /** Space around the scroll body. Defaults to 16 on all sides. */
  bodyPadding?: number;
  bodyPaddingTop?: number;
  bodyPaddingBottom?: number;
  /** Gap between body children (12, 16, 24 or 32, depending on the screen). */
  bodyGap?: number;
  /** Space between the title block and the body. Defaults to 8 (4 on forms). */
  titleGap?: number;
  /** Content that belongs to the header, below the title (Money's total, Stock's filters). */
  headerExtra?: ReactNode;
  /** Gap inside the pinned footer. Defaults to 10. */
  footerGap?: number;
  /** Forms that sit over a list cast a shadow above the footer. */
  footerShadow?: boolean;
  children: ReactNode;
};

/** Page shell matching the mockups: top bar, large title, padded body, optional pinned footer. */
export function Screen({
  title,
  subtitle,
  titleVariant = 'largeTitle',
  left,
  right,
  footer,
  scroll = true,
  inlineActions,
  subtitleAbove,
  hideTitle,
  bodyPadding = space.lg,
  bodyPaddingTop,
  bodyPaddingBottom = space.xxl,
  bodyGap = space.lg,
  titleGap = space.sm,
  headerExtra,
  footerGap = 10,
  footerShadow,
  children,
}: ScreenProps) {
  const hasBar = !!(left || right) && !inlineActions;
  const titleBlock = (
    <View style={{ flex: 1, gap: 2 }}>
      {subtitleAbove && subtitle ? <Text variant="caption">{subtitle}</Text> : null}
      <Text variant={titleVariant} accessibilityRole="header">
        {title}
      </Text>
      {!subtitleAbove && subtitle ? <Text variant="caption">{subtitle}</Text> : null}
    </View>
  );
  const refreshControl = usePullToRefresh();
  const body = scroll ? (
    <ScrollView
      refreshControl={refreshControl}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: bodyPadding,
        paddingTop: bodyPaddingTop ?? bodyPadding,
        paddingBottom: bodyPaddingBottom,
        gap: bodyGap,
      }}>
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
              paddingTop: 4,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <View>{left}</View>
            <View style={{ marginRight: space.sm }}>{right}</View>
          </View>
        ) : null}
        {hideTitle ? null : (
          <View
            style={{
              paddingHorizontal: space.lg,
              paddingTop: hasBar ? 0 : 12,
              paddingBottom: titleGap,
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.md,
            }}>
            {inlineActions && left ? left : null}
            {titleBlock}
            {inlineActions && right ? right : null}
          </View>
        )}
        {headerExtra ? (
          <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm, gap: space.xs }}>{headerExtra}</View>
        ) : null}
        {body}
        {footer ? (
          <SafeAreaView
            edges={['bottom']}
            style={{
              paddingHorizontal: space.lg,
              paddingTop: space.sm,
              paddingBottom: 0,
              gap: footerGap,
              backgroundColor: colors.surface,
              ...(footerShadow ? { boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.06)' } : null),
            }}>
            {footer}
          </SafeAreaView>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
