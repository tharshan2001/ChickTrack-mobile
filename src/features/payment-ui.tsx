import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import type { Settlement } from '@/api/types';
import { ChevronRightIcon } from '@/components/icons';
import { Text } from '@/components/text';
import { Badge } from '@/components/ui';
import { METHOD_LABEL } from '@/features/money-api';
import { formatRupees } from '@/lib/format';
import { colors, fonts, space } from '@/theme/tokens';

/** "Wed 4 Nov" from an ISO business date. */
/** The Colombo calendar day (YYYY-MM-DD) of an instant, e.g. when a delivery was received. */
export function colomboDay(instant: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(instant),
  );
}

export function dayLabel(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y!, m! - 1, d!)),
  );
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * One payment in a list: branch on top, then method · reference · date. A reversed
 * payment keeps its date and shows why it was reversed, with the amount struck through.
 */
export function PaymentRow({ p, branch }: { p: Settlement; branch?: string }) {
  const reversed = p.status === 'REVERSED';
  const method = capital(METHOD_LABEL[p.method] ?? p.method.toLowerCase());
  const detail = [method, p.reference, dayLabel(p.settlementDate)].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${branch ?? ''} ${detail}, ${formatRupees(p.amount)}${reversed ? ', reversed' : ''}`}
      onPress={() => router.push({ pathname: '/payments/[id]', params: { id: p.id } })}
      style={({ pressed }) => ({
        minHeight: 64,
        paddingLeft: space.lg,
        paddingRight: space.md,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        backgroundColor: pressed ? colors.field : 'transparent',
      })}>
      <View style={{ flex: 1, gap: 4, alignItems: 'flex-start' }}>
        <Text variant="bodyMedium" numberOfLines={1} style={reversed ? { color: colors.secondary } : undefined}>
          {branch ?? detail}
        </Text>
        {branch ? (
          <Text variant="caption" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
        {reversed ? <Badge label={`Reversed · ${p.reversalReason ?? 'bounced'}`} tone="danger" /> : null}
      </View>
      <Text
        variant="mono"
        style={reversed ? { color: colors.secondary, textDecorationLine: 'line-through' } : undefined}>
        {formatRupees(p.amount).replace('Rs ', '')}
      </Text>
      <ChevronRightIcon size={16} color="#AEAEB2" />
    </Pressable>
  );
}

/** Section title with an optional link on the right ("See all"). */
export function TitleWithLink({
  title,
  link,
  onPress,
  small,
}: {
  title: string;
  link?: string;
  onPress?: () => void;
  small?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginHorizontal: small ? space.xs : 0 }}>
      <Text variant={small ? 'labelSmall' : 'title'}>{title}</Text>
      {link && onPress ? (
        <Pressable accessibilityRole="link" hitSlop={8} onPress={onPress}>
          <Text variant={small ? 'caption' : 'bodyMedium'} style={{ color: colors.accent, fontFamily: fonts.bodyMedium }}>
            {link}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** "2 unpaid deliveries · oldest 4 Nov", or "All paid". */
export function unpaidLine(deliveries: { receivedAt: string }[] | undefined) {
  if (!deliveries) return undefined;
  if (!deliveries.length) return 'All paid';
  const oldest = [...deliveries].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))[0]!;
  const when = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Colombo' }).format(
    new Date(oldest.receivedAt),
  );
  return `${deliveries.length} unpaid ${deliveries.length === 1 ? 'delivery' : 'deliveries'} · oldest ${when}`;
}
