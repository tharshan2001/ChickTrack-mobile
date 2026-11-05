import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { Text } from '@/components/text';
import { fonts } from '@/theme/tokens';

const INK = '#4A2511';
const RED = '#D7261E';
const ORANGE = '#F28C28';
const YELLOW = '#FFC93C';
const CREAM = '#FFF3DF';
const BROWN = '#6B4A33';

const HALO = 240;
const W = 172;
const H = 208;
const K = W / 146;
const at = (x: number, y: number): [number, number, number] => [(x - 38) * K, (y - 4) * K, 0];

const stroke = { stroke: INK, strokeWidth: 4, strokeLinejoin: 'round', strokeLinecap: 'round' } as const;

function Layer({ children, style }: { children: ReactNode; style?: object }) {
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width={W} height={H} viewBox="38 4 146 176">
        {children}
      </Svg>
    </Animated.View>
  );
}

function wave(value: Animated.Value, duration: number) {
  const half = (toValue: number) =>
    Animated.timing(value, { toValue, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true });
  return Animated.loop(Animated.sequence([half(1), half(0)]));
}

function dot(value: Animated.Value, delay: number) {
  const step = (toValue: number) => Animated.timing(value, { toValue, duration: 300, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
  return Animated.loop(Animated.sequence([Animated.delay(delay), step(1), step(0), Animated.delay(400 - delay)]));
}

function useReduceMotion() {
  const [still, setStill] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setStill);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setStill);
    return () => sub.remove();
  }, []);
  return still;
}

export function LaunchScreen() {
  const still = useReduceMotion();
  const bob = useState(() => new Animated.Value(0))[0];
  const sway = useState(() => new Animated.Value(0))[0];
  const lid = useState(() => new Animated.Value(1))[0];
  const intro = useState(() => new Animated.Value(0))[0];
  const dots = useState(() => [new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)])[0];

  useEffect(() => {
    Animated.timing(intro, { toValue: 1, duration: 600, delay: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    if (still) return;
    const loops = [wave(bob, 800), wave(sway, 800), ...dots.map((d, i) => dot(d, i * 150))];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [still, bob, sway, intro, dots]);

  useEffect(() => {
    if (still) return;
    let timer: ReturnType<typeof setTimeout>;
    const blink = (twice: boolean) => {
      Animated.sequence([
        Animated.timing(lid, { toValue: 0.08, duration: 70, useNativeDriver: true }),
        Animated.timing(lid, { toValue: 1, duration: 110, useNativeDriver: true }),
      ]).start(() => {
        timer = setTimeout(() => (twice ? blink(false) : schedule()), twice ? 120 : 0);
      });
    };
    const schedule = () => {
      timer = setTimeout(() => blink(Math.random() < 0.25), 1200 + Math.random() * 3800);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [still, lid]);

  const body = {
    transformOrigin: at(100, 150),
    transform: [
      { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
      { scaleX: bob.interpolate({ inputRange: [0, 1], outputRange: [1.02, 0.99] }) },
      { scaleY: bob.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.01] }) },
    ],
  };
  const swayStyle = (x: number, y: number, reverse: boolean) => ({
    transformOrigin: at(x, y),
    transform: [{ rotate: sway.interpolate({ inputRange: [0, 1], outputRange: reverse ? ['5deg', '-5deg'] : ['-5deg', '5deg'] }) }],
  });
  const rise = { opacity: intro, transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] };

  return (
    <View style={styles.page} accessible accessibilityLabel="ChickTrack is loading">
      <View style={styles.halo}>
        <View style={{ width: W, height: H }}>
          <Layer
            style={{
              transformOrigin: at(104, 168),
              opacity: bob.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }),
              transform: [{ scaleX: bob.interpolate({ inputRange: [0, 1], outputRange: [1, 0.72] }) }],
            }}>
            <Ellipse cx={104} cy={168} rx={44} ry={6} fill={INK} fillOpacity={0.18} />
          </Layer>
          <Animated.View style={[StyleSheet.absoluteFill, body]}>
            <Layer style={swayStyle(100, 60, false)}>
              <Path d="M70 62 C58 40 76 26 88 40 C88 18 116 14 116 38 C126 24 146 34 134 58 Z" fill={RED} {...stroke} />
            </Layer>
            <Layer>
              <Ellipse cx={100} cy={100} rx={50} ry={48} fill={ORANGE} {...stroke} />
              <Ellipse cx={68} cy={116} rx={12} ry={8} fill="#FFD9A8" />
              <Path d="M74 70 Q85 62 94 70" fill="none" {...stroke} />
              <Path d="M106 72 Q115 67 126 72" fill="none" {...stroke} />
              <Path d="M88 114 Q100 140 114 114 Z" fill="#B71C1C" {...stroke} />
              <Path d="M94 125 Q100 133 108 125 Q100 121 94 125 Z" fill="#F48FB1" />
              <Path d="M82 108 Q100 96 120 106 Q112 118 100 117 Q88 117 82 108 Z" fill={YELLOW} {...stroke} />
            </Layer>
            <Layer style={{ transformOrigin: at(100, 90), transform: [{ scaleY: lid }] }}>
              <Ellipse cx={85} cy={90} rx={12} ry={15} fill="#FFFFFF" {...stroke} />
              <Ellipse cx={115} cy={90} rx={12} ry={15} fill="#FFFFFF" {...stroke} />
              <Circle cx={89} cy={92} r={6.5} fill={INK} />
              <Circle cx={113} cy={92} r={6.5} fill={INK} />
              <Circle cx={91} cy={89} r={2} fill="#FFFFFF" />
              <Circle cx={115} cy={89} r={2} fill="#FFFFFF" />
            </Layer>
            <Layer style={swayStyle(100, 134, true)}>
              <Path d="M94 134 C86 144 92 156 100 150 C108 156 114 144 106 134 Z" fill={RED} {...stroke} />
            </Layer>
            <Layer>
              <Rect x={150} y={80} width={15} height={40} rx={7.5} fill="#FFF1DC" {...stroke} />
              <Rect x={140} y={110} width={36} height={36} rx={11} fill="#FFF1DC" {...stroke} />
              <Path d="M141 122 H160 M141 133 H160" fill="none" {...stroke} strokeWidth={3} />
            </Layer>
          </Animated.View>
        </View>
      </View>

      <Animated.View style={[styles.words, rise]}>
        <Text style={styles.wordmark} maxFontSizeMultiplier={1.2}>
          <Text style={[styles.wordmark, { color: INK }]}>Chick</Text>
          <Text style={[styles.wordmark, { color: RED }]}>Track</Text>
        </Text>
        <Text style={styles.tagline} maxFontSizeMultiplier={1.2}>
          Fresh. Tracked. Delivered.
        </Text>
      </Animated.View>

      <View style={styles.footer}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {dots.map((d, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: [RED, ORANGE, INK][i] },
                {
                  opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
                  transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) }],
                },
              ]}
            />
          ))}
        </View>
        <Text style={styles.caption} maxFontSizeMultiplier={1.2}>
          Procurement &amp; Distribution
        </Text>
      </View>
    </View>
  );
}

export function LaunchOverlay({ ready }: { ready: boolean }) {
  const [minElapsed, setMinElapsed] = useState(false);
  const [gone, setGone] = useState(false);
  const fade = useState(() => new Animated.Value(1))[0];

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!ready || !minElapsed) return;
    Animated.timing(fade, { toValue: 0, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() =>
      setGone(true),
    );
  }, [ready, minElapsed, fade]);

  if (gone) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]} onLayout={() => void SplashScreen.hideAsync()}>
      <LaunchScreen />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: CREAM },
  halo: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: HALO,
    height: HALO,
    marginTop: -HALO / 2,
    marginLeft: -HALO / 2,
    borderRadius: HALO / 2,
    backgroundColor: YELLOW,
    alignItems: 'center',
    justifyContent: 'center',
  },
  words: { position: 'absolute', top: '50%', left: 0, right: 0, marginTop: HALO / 2 + 28, alignItems: 'center', gap: 8 },
  wordmark: { fontFamily: fonts.title, fontSize: 44, lineHeight: 50, letterSpacing: -0.5 },
  tagline: { fontFamily: fonts.bodySemiBold, fontSize: 13, lineHeight: 18, letterSpacing: 2, textTransform: 'uppercase', color: BROWN },
  footer: { position: 'absolute', bottom: 64, left: 0, right: 0, alignItems: 'center', gap: 14 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  caption: { fontFamily: fonts.bodySemiBold, fontSize: 12, lineHeight: 16, color: BROWN },
});
