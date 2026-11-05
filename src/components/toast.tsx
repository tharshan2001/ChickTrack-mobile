/**
 * Global toasts: light cards that drop in at the top of the screen.
 *
 *   toast.success('Payment recorded', { detail: 'Rs 60,000.00 from Kandy', action: { label: 'View', onPress } })
 *   toast.error("Couldn't save the sale", { detail: 'No connection.', action: { label: 'Retry', onPress } })
 *   toast.warning('Payment reversed')   toast.info("You're offline")
 *
 * Success, warning and info close on their own (4 s, 2.5 s without detail);
 * errors stay until closed. Up to three stack, newest on top. Swipe up or tap ×
 * to dismiss. Each kind has its haptic; errors are announced right away.
 */
import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeOut,
  LinearTransition,
  ReduceMotion,
  runOnJS,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/components/haptics';
import { Text } from '@/components/text';
import { colors, fonts } from '@/theme/tokens';

type Kind = 'success' | 'warning' | 'error' | 'info';
type Action = { label: string; onPress: () => void };
type Options = { detail?: string; action?: Action; duration?: number };
type Item = Options & { id: number; kind: Kind; title: string };

const KIND: Record<Kind, { icon: keyof typeof Feather.glyphMap; tint: string; soft: string; action: string }> = {
  success: { icon: 'check', tint: '#2F6F4E', soft: '#E7F1EA', action: '#2F6F4E' },
  warning: { icon: 'rotate-ccw', tint: '#B06A10', soft: '#FBEFD9', action: '#7A4B0E' },
  error: { icon: 'alert-circle', tint: '#A2080C', soft: '#FBE7E5', action: '#A2080C' },
  info: { icon: 'info', tint: '#48484A', soft: '#F2F2F4', action: colors.ink },
};

// ---------- store ----------

let items: Item[] = [];
let nextId = 0;
const listeners = new Set<(list: Item[]) => void>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function emit() {
  listeners.forEach((l) => l(items));
}

function dismiss(id: number) {
  clearTimeout(timers.get(id));
  timers.delete(id);
  items = items.filter((t) => t.id !== id);
  emit();
}

function show(kind: Kind, title: string, opts: Options = {}) {
  const id = ++nextId;
  items = [{ ...opts, id, kind, title }, ...items].slice(0, 3);
  emit();
  if (kind === 'success') haptic.success();
  else if (kind === 'warning') haptic.warning();
  else if (kind === 'error') haptic.error();
  const ms = opts.duration ?? (kind === 'error' ? 0 : opts.detail || opts.action ? 4000 : 2500);
  if (ms > 0) timers.set(id, setTimeout(() => dismiss(id), ms));
  return id;
}

export const toast = {
  success: (title: string, opts?: Options) => show('success', title, opts),
  warning: (title: string, opts?: Options) => show('warning', title, opts),
  error: (title: string, opts?: Options) => show('error', title, opts),
  info: (title: string, opts?: Options) => show('info', title, opts),
  dismiss,
};

// ---------- view ----------

function ToastCard({ t, behind }: { t: Item; behind: number }) {
  const k = KIND[t.kind];
  const y = useSharedValue(0);
  const close = () => dismiss(t.id);

  // Drag up to dismiss; a small pull springs back.
  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => y.set(Math.min(0, g.dy) + Math.max(0, g.dy) * 0.15),
      onPanResponderRelease: (_, g) => {
        if (g.dy < -30 || g.vy < -0.5) y.set(withTiming(-140, { duration: 160 }, () => runOnJS(close)()));
        else y.set(withSpring(0, { damping: 18 }));
      },
    }),
  );
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { scale: withTiming(1 - behind * 0.04, { duration: 200 }) }],
    opacity: withTiming(behind ? 0.9 : 1, { duration: 200 }),
  }));

  return (
    <Animated.View
      entering={SlideInUp.springify().damping(17).stiffness(220).reduceMotion(ReduceMotion.System)}
      exiting={FadeOut.duration(160)}
      layout={LinearTransition.duration(200).reduceMotion(ReduceMotion.System)}
      {...pan.panHandlers}
      accessibilityRole={t.kind === 'error' ? 'alert' : undefined}
      accessibilityLiveRegion={t.kind === 'error' ? 'assertive' : 'polite'}
      style={[styles.card, style]}>
      <View style={[styles.icon, { backgroundColor: k.soft }]}>
        <Feather name={k.icon} size={16} color={k.tint} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Text style={styles.title} numberOfLines={2}>
          {t.title}
        </Text>
        {t.detail ? (
          <Text variant="caption" style={styles.detail} numberOfLines={2}>
            {t.detail}
          </Text>
        ) : null}
      </View>
      {t.action ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            dismiss(t.id);
            t.action!.onPress();
          }}
          style={({ pressed }) => [styles.action, { backgroundColor: k.soft, opacity: pressed ? 0.7 : 1 }]}>
          <Text style={[styles.actionText, { color: k.action }]}>{t.action.label}</Text>
        </Pressable>
      ) : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={4} onPress={close} style={styles.close}>
        <Feather name="x" size={16} color="#8E8E93" />
      </Pressable>
    </Animated.View>
  );
}

/** Mounted once at the root, above every screen. */
export function ToastHost() {
  const [list, setList] = useState(items);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { paddingTop: insets.top + 6, paddingHorizontal: 12, gap: 8 }]}>
      {list.map((t, i) => (
        <ToastCard key={t.id} t={t} behind={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderWidth: 1,
    borderColor: '#ECECEF',
    boxShadow: '0 12px 32px rgba(35, 31, 32, 0.12), 0 2px 6px rgba(35, 31, 32, 0.06)',
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 20, color: colors.ink },
  detail: { lineHeight: 17, letterSpacing: 0 },
  action: { height: 36, paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center' },
  actionText: { fontFamily: fonts.bodySemiBold, fontSize: 15 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
