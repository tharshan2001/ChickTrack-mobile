import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { onPullRefresh } from '@/components/screen';
import { Text } from '@/components/text';
import { BUSINESS_TZ } from '@/lib/format';
import { colors, fonts, radius } from '@/theme/tokens';

const CREAM = '#FFF3DF';
const SUN = '#FFC93C';
const INK = '#4A2511';
const RED = '#D7261E';
const EDGE = 'rgba(162, 8, 12, 0.38)';
const GLOW = 'rgba(162, 8, 12, 0.12)';

function dateParts() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BUSINESS_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { weekday: get('weekday'), date: `${get('day')} ${get('month')} ${get('year')}` };
}

/** The rooster bobs once when Home opens: a small hello, then it stays still. */
function Rooster() {
  const y = useSharedValue(0);
  const tilt = useSharedValue(0);
  useEffect(() => {
    const cfg = { duration: 220, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.System };
    y.set(withDelay(350, withSequence(withTiming(-7, cfg), withTiming(0, cfg), withTiming(-3, cfg), withTiming(0, cfg))));
    // Each pull-to-refresh: a quick hop with a little head shake.
    return onPullRefresh(() => {
      const quick = { duration: 140, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.System };
      y.set(withSequence(withTiming(-12, quick), withTiming(0, { ...quick, duration: 200 }), withTiming(-4, quick), withTiming(0, quick)));
      tilt.set(withSequence(withTiming(-8, quick), withTiming(8, quick), withTiming(-4, quick), withTiming(0, quick)));
    });
  }, [y, tilt]);
  const bob = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { rotate: `${tilt.value}deg` }] }));
  return (
    <Animated.View style={[styles.rooster, bob]}>
      <Svg width={92} height={98} viewBox="46 12 112 150">
      <G stroke={INK} strokeWidth={4.5} strokeLinejoin="round" strokeLinecap="round">
        <Path d="M70 62 C58 40 76 26 88 40 C88 18 116 14 116 38 C126 24 146 34 134 58 Z" fill={RED} />
        <Ellipse cx={100} cy={100} rx={50} ry={48} fill="#F28C28" />
        <Ellipse cx={68} cy={116} rx={12} ry={8} fill="#FFD9A8" stroke="none" />
        <Ellipse cx={85} cy={90} rx={12} ry={15} fill="#FFFFFF" />
        <Ellipse cx={115} cy={90} rx={12} ry={15} fill="#FFFFFF" />
        <Circle cx={89} cy={92} r={6.5} fill={INK} stroke="none" />
        <Circle cx={113} cy={92} r={6.5} fill={INK} stroke="none" />
        <Circle cx={91} cy={89} r={2} fill="#FFFFFF" stroke="none" />
        <Circle cx={115} cy={89} r={2} fill="#FFFFFF" stroke="none" />
        <Path d="M88 114 Q100 140 114 114 Z" fill="#B71C1C" />
        <Path d="M82 108 Q100 96 120 106 Q112 118 100 117 Q88 117 82 108 Z" fill={SUN} />
        <Path d="M94 134 C86 144 92 156 100 150 C108 156 114 144 106 134 Z" fill={RED} />
      </G>
      </Svg>
    </Animated.View>
  );
}

export function WelcomeBanner({ greeting, name }: { greeting: string; name?: string }) {
  const { date } = dateParts();
  const label = name ? `${greeting}, ${name}` : greeting;
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={`${date}. ${label}`} style={styles.card}>
      <Text style={styles.date}>{date}</Text>
      <View style={styles.hello}>
        <Text style={styles.greeting}>{name ? `${greeting},` : greeting}</Text>
        {name ? (
          <Text variant="largeTitle" style={styles.name} numberOfLines={1}>
            {name}
          </Text>
        ) : null}
      </View>
      <View style={styles.sun} />
      <Rooster />
      <View pointerEvents="none" style={styles.glowTop} />
      <View pointerEvents="none" style={[styles.glowSide, { left: 0 }]} />
      <View pointerEvents="none" style={[styles.glowSide, { right: 0 }]} />
      <View pointerEvents="none" style={styles.edgeTop} />
      <View pointerEvents="none" style={[styles.edgeSide, { left: 0 }]} />
      <View pointerEvents="none" style={[styles.edgeSide, { right: 0 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  date: {
    fontFamily: fonts.mono,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.accentPressed,
  },
  card: {
    minHeight: 118,
    borderRadius: radius.card,
    backgroundColor: CREAM,
    boxShadow: '0 8px 24px rgba(162, 8, 12, 0.12), 0 2px 6px rgba(35, 31, 32, 0.06)',
    overflow: 'hidden',
    paddingVertical: 20,
    paddingLeft: 20,
    paddingRight: 120,
    justifyContent: 'center',
    gap: 8,
  },
  hello: { gap: 2 },
  greeting: { fontFamily: fonts.body, fontSize: 20, lineHeight: 24, color: '#5A3A2A', includeFontPadding: false },
  name: { fontSize: 26, lineHeight: 30, includeFontPadding: false },
  sun: { position: 'absolute', right: -26, bottom: -34, width: 150, height: 150, borderRadius: 75, backgroundColor: SUN },
  edgeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: radius.card,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: EDGE,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
  },
  edgeSide: {
    position: 'absolute',
    top: radius.card,
    width: 1,
    height: '45%',
    experimental_backgroundImage: `linear-gradient(to bottom, ${EDGE}, rgba(162, 8, 12, 0))`,
  },
  // A wider, fainter copy under the 1 px edge reads as a soft blur.
  glowTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: radius.card + 2,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: GLOW,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
  },
  glowSide: {
    position: 'absolute',
    top: radius.card + 2,
    width: 3,
    height: '45%',
    experimental_backgroundImage: `linear-gradient(to bottom, ${GLOW}, rgba(162, 8, 12, 0))`,
  },
  rooster: { position: 'absolute', right: 12, bottom: -6 },
});
