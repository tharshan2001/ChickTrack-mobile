/**
 * Small, shared motion pieces. Everything here is short (150–400 ms), never loops,
 * and switches off when the phone's "Reduce motion" setting is on.
 */
import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type React from 'react';
import { Children, isValidElement, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { colors, fonts } from '@/theme/tokens';

// ---------- Reduce motion ----------

let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then((v) => (reduceMotion = v))
  .catch(() => undefined);
AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => (reduceMotion = v));

export function useReduceMotion() {
  const [still, setStill] = useState(reduceMotion);
  useEffect(() => {
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setStill);
    return () => sub.remove();
  }, []);
  return still;
}

// ---------- Haptics (best effort; silently does nothing where unsupported) ----------

const safe = (f: () => Promise<unknown>) => {
  f().catch(() => undefined);
};
export const haptic = {
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  select: () => safe(() => Haptics.selectionAsync()),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

// ---------- A. Press feedback ----------

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** A Pressable that shrinks slightly while held. Use for tappable cards. */
export function PressScale({
  style,
  children,
  scaleTo = 0.98,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & { style?: StyleProp<ViewStyle>; children: ReactNode; scaleTo?: number }) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e) => {
        if (!reduceMotion) scale.set(withTiming(scaleTo, { duration: 90 }));
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, { damping: 18, stiffness: 320 }));
        props.onPressOut?.(e);
      }}
      style={[style, anim]}>
      {children}
    </AnimatedPressable>
  );
}

// ---------- B. Number count ----------

/**
 * Shows a decimal amount that glides from its previous value to the new one.
 * `format` turns the decimal string into what is shown (e.g. formatRupees).
 * The first value appears as is; only later changes animate.
 */
export function useCountUp(value: string | null | undefined, decimals: number, duration = 350) {
  const [target, setTarget] = useState(value ?? null);
  const [from, setFrom] = useState<string | null>(null);
  const [shown, setShown] = useState<string | null>(null);

  // A new target: remember where we were, and start the glide from there.
  if ((value ?? null) !== target) {
    setFrom(target);
    setTarget(value ?? null);
    setShown(target);
  }

  useEffect(() => {
    if (from == null || target == null) return;
    const a = Number(from);
    const b = Number(target);
    let raf = 0;
    if (reduceMotion || !Number.isFinite(a) || !Number.isFinite(b)) {
      raf = requestAnimationFrame(() => setShown(null));
      return () => cancelAnimationFrame(raf);
    }
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      if (t >= 1) return setShown(null);
      setShown((a + (b - a) * (1 - Math.pow(1 - t, 3))).toFixed(decimals));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, target, decimals, duration]);

  return shown ?? target;
}

/** Text that counts to a new amount. `format` renders the decimal string. */
export function CountText({
  value,
  decimals = 2,
  format,
  ...textProps
}: { value: string | null | undefined; decimals?: number; format: (v: string) => string } & Omit<
  React.ComponentProps<typeof Text>,
  'children'
>) {
  const shown = useCountUp(value, decimals);
  return <Text {...textProps}>{shown == null ? '…' : format(shown)}</Text>;
}

// ---------- C. List enter / exit / re-flow ----------

const enter = FadeInDown.duration(220).withInitialValues({ transform: [{ translateY: 6 }] }).reduceMotion(ReduceMotion.System);
const exit = FadeOut.duration(160).reduceMotion(ReduceMotion.System);
const flow = LinearTransition.duration(220).easing(Easing.out(Easing.cubic)).reduceMotion(ReduceMotion.System);

/**
 * Wrap list items (or cards that come and go). Items fade up when they appear,
 * fade out when removed, and the rest slide into place. Set `still` to skip the
 * entrance (e.g. for the rows present when the screen first opens).
 */
export function Appear({ children, style, still }: { children: ReactNode; style?: StyleProp<ViewStyle>; still?: boolean }) {
  return (
    <Animated.View entering={still ? undefined : enter} exiting={exit} layout={flow} style={style}>
      {children}
    </Animated.View>
  );
}

/**
 * Wraps each keyed child in <Appear>, so items added or removed animate and the
 * rest re-flow. `<AppearList still={firstLoad}>{rows.map(...)}</AppearList>`
 */
export function AppearList({ children, still }: { children: ReactNode; still?: boolean }) {
  return (
    <>
      {Children.toArray(children).map((c, i) => (
        <Appear key={isValidElement(c) && c.key != null ? c.key : i} still={still}>
          {c}
        </Appear>
      ))}
    </>
  );
}

/** Only animate items added after the first load: returns true while the first batch is on screen. */
export function useFirstBatch(ready: boolean) {
  const [first, setFirst] = useState(true);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setFirst(false), 400);
    return () => clearTimeout(t);
  }, [ready]);
  return first;
}

// ---------- D. Saved ✓ ----------

type Listener = (label: string) => void;
let savedListener: Listener | null = null;

/** Close the form and show a brief ✓ over the screen underneath, with a success haptic. */
export function savedAndBack(label = 'Saved') {
  haptic.success();
  savedListener?.(label);
  if (router.canGoBack()) router.back();
}

/** Show the ✓ without navigating (e.g. an action on the same screen). */
export function showSaved(label = 'Saved') {
  haptic.success();
  savedListener?.(label);
}

/** Mounted once at the root; renders the ✓ pill. */
export function SavedHost() {
  const [label, setLabel] = useState<string | null>(null);
  const [n, setN] = useState(0);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    savedListener = (l) => {
      setLabel(l);
      setN((x) => x + 1);
    };
    return () => {
      savedListener = null;
    };
  }, []);
  useEffect(() => {
    if (!label) return;
    const t = setTimeout(() => setLabel(null), 1100);
    return () => clearTimeout(t);
  }, [label, n]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', paddingTop: insets.top + 8 }]}>
      {label ? (
        <Animated.View
          key={n}
          entering={ZoomIn.springify().damping(16).reduceMotion(ReduceMotion.System)}
          exiting={FadeOut.duration(200)}
          accessibilityLiveRegion="polite"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            height: 40,
            paddingHorizontal: 16,
            borderRadius: 20,
            backgroundColor: colors.ink,
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.18)',
          }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="check" size={14} color={colors.surface} />
          </View>
          <Text style={{ color: colors.surface, fontFamily: fonts.bodyMedium }}>{label}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

// ---------- E. Status flip ----------

/** Wrap a badge: when its label changes after mount, the new one pops in. */
export function Flip({ id, children }: { id: string; children: ReactNode }) {
  const [initial] = useState(id);
  return (
    <Animated.View
      key={id}
      style={{ flexShrink: 1 }}
      entering={id === initial ? undefined : ZoomIn.springify().damping(14).reduceMotion(ReduceMotion.System)}>
      {children}
    </Animated.View>
  );
}

// ---------- F. Bars grow ----------

/** A horizontal bar segment that grows to `pct` (0–100) when it first appears and when it changes. */
export function GrowBar({ pct, color, height = 6, delay = 0 }: { pct: number; color: string; height?: number; delay?: number }) {
  const w = useSharedValue(reduceMotion ? pct : 0);
  useEffect(() => {
    w.set(reduceMotion ? pct : withTiming(pct, { duration: 500, easing: Easing.out(Easing.cubic) }));
    // delay only applies to the first grow
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct]);
  useEffect(() => {
    if (delay && !reduceMotion) w.set(withSequence(withTiming(0, { duration: delay }), withTiming(pct, { duration: 500 })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return <Animated.View style={[{ height, backgroundColor: color }, style]} />;
}

// ---------- Misc ----------

/** Softly greys its content when `dim` is on (e.g. a branch switched to inactive). */
export function Dim({ dim, children }: { dim: boolean; children: ReactNode }) {
  const o = useSharedValue(dim ? 0.45 : 1);
  useEffect(() => {
    o.set(withTiming(dim ? 0.45 : 1, { duration: 250, reduceMotion: ReduceMotion.System }));
  }, [dim, o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** Fade + rise for a block when a screen opens (sign-in fields). `index` staggers them. */
export function Rise({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(80 + index * 60).duration(320).reduceMotion(ReduceMotion.System)}
      style={style}>
      {children}
    </Animated.View>
  );
}

/** Horizontal shake for a wrong-password style error. Call `shake()` to run it. */
export function useShake() {
  const x = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const shake = () => {
    haptic.error();
    if (reduceMotion) return;
    x.set(withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 60 }),
      withTiming(-6, { duration: 60 }),
      withTiming(4, { duration: 60 }),
      withTiming(0, { duration: 50 }),
    ));
  };
  return { style, shake };
}

/** A soft fade when content swaps (e.g. "will still owe" line). */
export const fadeSwap = FadeIn.duration(180).reduceMotion(ReduceMotion.System);
