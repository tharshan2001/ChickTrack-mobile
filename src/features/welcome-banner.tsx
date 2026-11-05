import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { Text } from '@/components/text';
import { BUSINESS_TZ } from '@/lib/format';
import { cardShadow, colors, fonts, radius } from '@/theme/tokens';

const CREAM = '#FFF3DF';
const SUN = '#FFC93C';
const INK = '#4A2511';
const RED = '#D7261E';

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

function Rooster() {
  return (
    <Svg width={92} height={98} viewBox="46 12 112 150" style={styles.rooster}>
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
  );
}

/** Today's date (no weekday), shown at the top left of Home above the welcome card. */
export function BannerDate() {
  return (
    <Text style={styles.date} accessibilityRole="text">
      {dateParts().date}
    </Text>
  );
}

export function WelcomeBanner({ greeting, name }: { greeting: string; name?: string }) {
  const { weekday } = dateParts();
  const label = name ? `${greeting}, ${name}` : greeting;
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={`${weekday}. ${label}`} style={styles.card}>
      <Text style={styles.date}>{weekday}</Text>
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
    borderWidth: 1,
    borderColor: 'rgba(162, 8, 12, 0.25)',
    ...cardShadow,
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
  rooster: { position: 'absolute', right: 12, bottom: -6 },
});
