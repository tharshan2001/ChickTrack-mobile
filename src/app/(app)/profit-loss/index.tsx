import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { branches } from '@/api/resources';
import type { ProfitLoss } from '@/api/types';
import { DateField } from '@/components/date-field';
import { Segmented, SelectField } from '@/components/pickers';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Card, ErrorBanner, IconButton, Separator } from '@/components/ui';
import { MonthStepper, shiftMonth } from '@/features/month-stepper';
import { Bars, StatementRow, amount, expenseDetail, negate, netColor } from '@/features/pl-ui';
import { monthName, periodLabel, useProfitLoss, type PLGroupBy, type PLParams, type PLPeriod } from '@/features/profit-loss-api';
import { exportProfitLoss } from '@/lib/export';
import { trimZeros } from '@/lib/decimal';
import { addDays, colomboToday, formatIsoDate } from '@/lib/format';
import { colors, fonts, space } from '@/theme/tokens';

export default function ProfitLossScreen() {
  const today = colomboToday();
  const [period, setPeriod] = useState<PLPeriod>('monthly');
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [custom, setCustom] = useState({ from: addDays(today, -90), to: today });
  const [groupBy, setGroupBy] = useState<PLGroupBy>('month');
  const [branchId, setBranchId] = useState('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const branchList = branches.useList('');

  const scope = branchId === 'all' ? undefined : branchId;
  const params: PLParams =
    period === 'daily'
      ? { period, date: day, branchId: scope }
      : period === 'monthly'
        ? { period, month, branchId: scope }
        : period === 'yearly'
          ? { period, year: String(year), branchId: scope }
          : { period, from: custom.from, to: custom.to, groupBy, branchId: scope };
  const pl = useProfitLoss(params);
  const data = pl.data;
  const s = data?.summary;

  const stepper =
    period === 'daily' ? (
      <MonthStepper
        label={formatIsoDate(day)}
        previousLabel="Previous day"
        nextLabel="Next day"
        onPrevious={() => setDay(addDays(day, -1))}
        onNext={day < today ? () => setDay(addDays(day, 1)) : undefined}
      />
    ) : period === 'monthly' ? (
      <MonthStepper
        label={monthName(month)}
        previousLabel="Previous month"
        nextLabel="Next month"
        onPrevious={() => setMonth(shiftMonth(month, -1))}
        onNext={month < today.slice(0, 7) ? () => setMonth(shiftMonth(month, 1)) : undefined}
      />
    ) : period === 'yearly' ? (
      <MonthStepper
        label={String(year)}
        previousLabel="Previous year"
        nextLabel="Next year"
        onPrevious={() => setYear(year - 1)}
        onNext={year < Number(today.slice(0, 4)) ? () => setYear(year + 1) : undefined}
      />
    ) : null;

  function pick(b: ProfitLoss['breakdown'][number]) {
    if (b.label.length === 10) {
      setDay(b.from);
      setPeriod('daily');
    } else if (b.label.length === 7) {
      setMonth(b.label);
      setPeriod('monthly');
    } else {
      setYear(Number(b.label));
      setPeriod('yearly');
    }
  }

  async function runExport(format: 'csv' | 'pdf') {
    if (!data) return;
    setBusy(format);
    setExportError(null);
    try {
      await exportProfitLoss(params, format, { from: data.from, to: data.to });
    } catch (e) {
      setExportError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const exportButtons = (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {(['csv', 'pdf'] as const).map((format) => (
        <Pressable
          key={format}
          accessibilityRole="button"
          accessibilityLabel={`Export profit and loss as ${format.toUpperCase()}`}
          disabled={busy !== null || !data}
          onPress={() => void runExport(format)}
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
            {busy === format ? '…' : format.toUpperCase()}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  const statementParams = {
    ...Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)),
    groupBy: 'none',
  } as Record<string, string>;

  return (
    <Screen
      title="Profit & loss"
      left={<IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />}
      right={exportButtons}
      titleGap={12}
      bodyGap={14}
      bodyPaddingTop={10}
      headerExtra={
        <View style={{ gap: 12 }}>
          <Segmented
            label="Period"
            hideLabel
            compact
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'daily', label: 'Day' },
              { value: 'monthly', label: 'Month' },
              { value: 'yearly', label: 'Year' },
              { value: 'custom', label: 'Custom' },
            ]}
          />
          {period === 'custom' ? (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <DateField label="From" value={custom.from} onChange={(from) => setCustom((c) => ({ ...c, from }))} compact />
                </View>
                <View style={{ flex: 1 }}>
                  <DateField label="To" value={custom.to} onChange={(to) => setCustom((c) => ({ ...c, to }))} compact />
                </View>
              </View>
              <Segmented
                label="Split by"
                compact
                value={groupBy}
                onChange={setGroupBy}
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'day', label: 'Day' },
                  { value: 'month', label: 'Month' },
                  { value: 'year', label: 'Year' },
                ]}
              />
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            {stepper ? <View style={{ flex: 1 }}>{stepper}</View> : null}
            <View style={{ flex: stepper ? undefined : 1, minWidth: 150 }}>
              <SelectField
                label="Branch"
                hideLabel
                compact
                value={branchId}
                onChange={setBranchId}
                options={[
                  { value: 'all', label: 'All branches' },
                  ...(branchList.data?.content ?? []).map((b) => ({ value: b.id, label: b.name })),
                ]}
              />
            </View>
          </View>
        </View>
      }>
      {pl.isError ? <ErrorBanner message={errorMessage(pl.error)} onRetry={pl.refetch} /> : null}
      {exportError ? <ErrorBanner message={exportError} /> : null}
      {pl.isPending ? <ActivityIndicator color={colors.accent} /> : null}
      {s && data ? (
        <>
          <View style={{ gap: 2 }}>
            <Text variant="caption">Net profit · {periodLabel(data)}</Text>
            <Text variant="numDisplay" style={{ color: netColor(s.netProfit) }}>
              {`${s.netProfit.startsWith('-') ? '−' : ''}Rs ${amount(s.netProfit).replace('−', '')}`}
            </Text>
            <Text variant="caption">
              {s.netMarginPercent ? `${trimZeros(s.netMarginPercent)}% of branch sales · ` : ''}
              {`branch sales Rs ${amount(s.branches.sales).replace(/\.00$/, '')}`}
            </Text>
          </View>

          <Card>
            <StatementRow label="Our margin on dispatches" value={s.headOffice.margin} />
            <Separator />
            <StatementRow label="Branch profit" value={s.branches.profit} />
            <Separator />
            <StatementRow
              label="Stock losses"
              detail={`${trimZeros(s.stockLosses.weightKg)} kg lost or damaged`}
              value={negate(s.stockLosses.value)}
              color={colors.warning}
            />
            <Separator />
            <StatementRow
              label="Operating expenses"
              detail={expenseDetail(s)}
              value={negate(s.operatingExpenses.total)}
              color={colors.danger}
              onPress={() => router.push('/expenses')}
            />
            <View style={{ height: 1, backgroundColor: colors.ink, marginHorizontal: space.lg }} />
            <StatementRow
              label="Net profit"
              detail="See full statement"
              value={s.netProfit}
              color={netColor(s.netProfit)}
              strong
              onPress={() => router.push({ pathname: '/profit-loss/statement', params: statementParams })}
            />
          </Card>

          {data.breakdown.length > 1 ? (
            <Card style={{ padding: space.lg, gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text variant="headline">By {data.groupBy.toLowerCase()}</Text>
                {data.groupBy !== 'YEAR' ? <Text variant="footnote">Tap a bar to open it</Text> : null}
              </View>
              <Bars breakdown={data.breakdown} onPick={pick} />
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
