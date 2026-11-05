import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { DateField } from '@/components/date-field';
import { Segmented } from '@/components/pickers';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Card, ErrorBanner, IconButton, Separator } from '@/components/ui';
import { useProfitReport } from '@/features/reports-api';
import { errorMessage } from '@/api/client';
import { exportReport } from '@/lib/export';
import { addDays, colomboToday, formatRupees, formatShortDate, weekStart } from '@/lib/format';
import { colors, fonts, space } from '@/theme/tokens';

type Period = 'today' | 'week' | 'month' | 'custom';

const EXPORTS: { name: string; title: string }[] = [
  { name: 'sales', title: 'Sales' },
  { name: 'distribution', title: 'Distribution' },
  { name: 'procurement', title: 'Procurement' },
  { name: 'stock', title: 'Stock & batch age' },
  { name: 'shrinkage', title: 'Shrinkage' },
  { name: 'settlements', title: 'Payments' },
];

function rangeFor(period: Period, custom: { from: string; to: string }) {
  const today = colomboToday();
  if (period === 'today') return { from: today, to: today };
  if (period === 'week') return { from: weekStart(today), to: today };
  if (period === 'month') return { from: `${today.slice(0, 7)}-01`, to: today };
  return custom;
}

export default function Reports() {
  const [period, setPeriod] = useState<Period>('week');
  const [custom, setCustom] = useState(() => ({ from: addDays(colomboToday(), -30), to: colomboToday() }));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const range = rangeFor(period, custom);
  const profit = useProfitReport(range);
  const rows = profit.data?.rows ?? [];
  const top = rows.reduce((max, r) => {
    const v = Number(r.branchProfit);
    return v > max ? v : max;
  }, 0);

  async function runExport(name: string, format: 'csv' | 'pdf') {
    setBusy(`${name}.${format}`);
    setError(null);
    try {
      await exportReport(name, format, range);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen
      title="Reports"
      left={<IconButton icon="chevron-left" label="Back to More" onPress={() => router.back()} />}
      bodyGap={16}
      titleGap={16}
      headerExtra={
        <View style={{ gap: 12 }}>
          <Segmented
            label="Period"
            hideLabel
            compact
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
              { value: 'custom', label: 'Custom' },
            ]}
          />
          {period === 'custom' ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <DateField label="From" value={custom.from} onChange={(from) => setCustom((c) => ({ ...c, from }))} compact />
              </View>
              <View style={{ flex: 1 }}>
                <DateField label="To" value={custom.to} onChange={(to) => setCustom((c) => ({ ...c, to }))} compact />
              </View>
            </View>
          ) : null}
        </View>
      }>
      {error ? <ErrorBanner message={error} /> : null}
      {profit.isError ? <ErrorBanner message={errorMessage(profit.error)} onRetry={profit.refetch} /> : null}

      <Card style={{ padding: space.lg, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="headline">Profit by branch</Text>
          <Text variant="caption">
            {formatShortDate(range.from)} – {formatShortDate(range.to)}
          </Text>
        </View>
        {profit.isPending ? <ActivityIndicator color={colors.accent} /> : null}
        {rows.length === 0 && !profit.isPending ? (
          <Text variant="caption">No sales in this period.</Text>
        ) : null}
        <View style={{ gap: 8 }}>
          {rows.map((r) => {
            const value = Number(r.branchProfit);
            const width = top > 0 ? Math.max(0, Math.round((value / top) * 100)) : 0;
            return (
              <View key={r.branchName} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text variant="caption" style={{ color: colors.ink }}>
                    {r.branchName}
                  </Text>
                  <Text variant="monoSmall" style={{ color: value > 0 ? colors.success : colors.secondary }}>
                    {formatRupees(r.branchProfit, 0)}
                  </Text>
                </View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.field, overflow: 'hidden' }}>
                  <View style={{ width: `${width}%`, height: 8, backgroundColor: colors.ink }} />
                </View>
              </View>
            );
          })}
        </View>
      </Card>

      <Card>
        {EXPORTS.map((e, i) => (
          <View key={e.name}>
            {i > 0 ? <Separator inset={space.lg} /> : null}
            <View style={{ minHeight: 52, paddingLeft: space.lg, paddingRight: space.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="body">{e.title}</Text>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {(['csv', 'pdf'] as const).map((format) => (
                  <Pressable
                    key={format}
                    accessibilityRole="button"
                    accessibilityLabel={`Export ${e.title} as ${format.toUpperCase()}`}
                    disabled={busy !== null}
                    onPress={() => void runExport(e.name, format)}
                    style={({ pressed }) => ({
                      height: 32,
                      paddingHorizontal: 10,
                      borderRadius: 6,
                      backgroundColor: colors.field,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed || busy !== null ? 0.6 : 1,
                    })}>
                    <Text style={{ fontFamily: fonts.mono, fontSize: 11, lineHeight: 14, color: colors.ink }}>
                      {busy === `${e.name}.${format}` ? '…' : format.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
