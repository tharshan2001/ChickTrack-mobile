import { Feather } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import type { ProfitLoss, ProfitLossStatement } from '@/api/types';
import { CountText, GrowHeight } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, fonts, space } from '@/theme/tokens';

export const amount = (v: string) => {
  const neg = v.startsWith('-');
  const [whole, frac = '00'] = v.replace('-', '').split('.');
  return `${neg ? '−' : ''}${whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${frac.padEnd(2, '0').slice(0, 2)}`;
};

export const negate = (v: string) => (v.startsWith('-') ? v.slice(1) : v === '0.00' || /^0+(\.0+)?$/.test(v) ? v : `-${v}`);

export const netColor = (v: string) => (v.startsWith('-') ? colors.danger : /^0+(\.0+)?$/.test(v) ? colors.secondary : colors.success);

export function StatementRow({
  label,
  detail,
  value,
  color,
  onPress,
  strong,
}: {
  label: string;
  detail?: string;
  value: string;
  color?: string;
  onPress?: () => void;
  strong?: boolean;
}) {
  return (
    <Pressable
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: strong ? 52 : 48,
        paddingLeft: space.lg,
        paddingRight: onPress ? space.md : space.lg,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        backgroundColor: pressed ? colors.field : 'transparent',
      })}>
      <View style={{ flex: 1, gap: 1 }}>
        <Text variant={strong ? 'bodyMedium' : 'body'} style={strong ? { fontFamily: fonts.bodySemiBold } : undefined}>
          {label}
        </Text>
        {detail ? <Text variant="footnote">{detail}</Text> : null}
      </View>
      <CountText variant={strong ? 'num' : 'mono'} style={{ color: color ?? colors.ink, fontSize: strong ? 16 : 15 }} value={value} format={amount} />
      {onPress ? <Feather name="chevron-right" size={14} color="#AEAEB2" /> : null}
    </Pressable>
  );
}

const MONTH_INITIAL = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export function Bars({
  breakdown,
  onPick,
}: {
  breakdown: ProfitLoss['breakdown'];
  onPick: (b: ProfitLoss['breakdown'][number]) => void;
}) {
  const values = breakdown.map((b) => Number(b.statement.netProfit));
  const top = Math.max(1, ...values.map((v) => Math.abs(v)));
  const hasLoss = values.some((v) => v < 0);
  const height = 120;
  const upSpace = hasLoss ? height * 0.72 : height;
  const best = Math.max(...values);
  const months = breakdown.length <= 12 && breakdown[0]?.label.length === 7;
  const ticks = months
    ? breakdown.map((b) => MONTH_INITIAL[Number(b.label.slice(5, 7)) - 1]!)
    : breakdown.map((b, i) =>
        i === 0 || i === breakdown.length - 1 || (i + 1) % 7 === 1 ? b.label.slice(-2).replace(/^0/, '') : '',
      );
  const gap = breakdown.length > 20 ? 2 : 6;
  return (
    <View style={{ gap: 6 }}>
      <View
        accessibilityRole="image"
        accessibilityLabel={`Net profit per ${months ? 'month' : 'day'}${hasLoss ? ', with loss periods below the line' : ''}`}
        style={{ height, flexDirection: 'row', gap }}>
        {breakdown.map((b, i) => {
          const v = values[i]!;
          const up = v > 0 ? Math.max(2, (v / top) * upSpace) : 0;
          const down = v < 0 ? Math.max(2, (-v / top) * (height - upSpace)) : 0;
          return (
            <Pressable
              key={b.label}
              accessibilityRole="button"
              accessibilityLabel={`${b.label}: ${amount(b.statement.netProfit)}`}
              onPress={() => onPick(b)}
              style={{ flex: 1, height, justifyContent: 'flex-start' }}>
              <View style={{ height: upSpace, justifyContent: 'flex-end' }}>
                <GrowHeight
                  height={up}
                  style={{
                    borderTopLeftRadius: 2,
                    borderTopRightRadius: 2,
                    backgroundColor: v === best && v > 0 ? colors.success : colors.ink,
                  }}
                />
              </View>
              <View style={{ height: 1, backgroundColor: '#C7C7CC' }} />
              <GrowHeight height={down} style={{ borderBottomLeftRadius: 2, borderBottomRightRadius: 2, backgroundColor: '#C0504A' }} />
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap }}>
        {ticks.map((t, i) => (
          <Text key={i} variant="footnote" style={{ flex: 1, textAlign: 'center', fontFamily: fonts.mono, fontSize: 10 }}>
            {t}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function expenseDetail(s: ProfitLossStatement) {
  const top = s.operatingExpenses.byCategory.slice(0, 2);
  return top.map((c) => `${c.categoryName} ${amount(c.amount).replace(/\.00$/, '')}`).join(' · ') || undefined;
}
