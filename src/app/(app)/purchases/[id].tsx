import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, type ReactNode } from 'react';
import { View } from 'react-native';

import { expenseCategories, products, suppliers } from '@/api/resources';
import type { Procurement, ProcurementItem } from '@/api/types';
import { EditLoader } from '@/components/form';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Badge, Card, IconButton, Notice, Separator } from '@/components/ui';
import { useProcurement } from '@/features/stock-api';
import { formatKg, toUnits } from '@/lib/decimal';
import { formatIsoDate, formatRupees, statusLabel } from '@/lib/format';
import { colors, fonts, space } from '@/theme/tokens';

const COMMISSION: Record<ProcurementItem['commissionMethod'], (v: string) => string> = {
  FIXED: () => 'fixed',
  PER_KG: (v) => `${formatRupees(v)}/kg`,
  PERCENTAGE: (v) => `${v.replace(/\.?0+$/, '')}%`,
  PER_BIRD: (v) => `${formatRupees(v)}/bird`,
};

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View
      style={{
        minHeight: 44,
        paddingHorizontal: space.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: space.md,
      }}>
      <Text variant={strong ? 'bodyMedium' : 'body'} style={strong ? undefined : { color: colors.secondary }}>
        {label}
      </Text>
      <Text variant={strong ? 'headline' : 'mono'} style={strong ? { fontFamily: fonts.mono } : undefined}>
        {value}
      </Text>
    </View>
  );
}

function Lines({ children }: { children: ReactNode[] }) {
  const kids = children.filter(Boolean);
  return (
    <>
      {kids.map((c, i) => (
        <Fragment key={i}>
          {i > 0 ? <Separator /> : null}
          {c}
        </Fragment>
      ))}
    </>
  );
}

export default function PurchaseDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <EditLoader title="Purchase" query={useProcurement(id)}>
      {(p) => <PurchaseDetail p={p} />}
    </EditLoader>
  );
}

function PurchaseDetail({ p }: { p: Procurement }) {
  const productList = products.useList('');
  const supplierList = suppliers.useList('');
  const categoryList = expenseCategories.useList('');
  const productName = (id: string) => productList.data?.content.find((x) => x.id === id)?.name ?? 'Product';
  const supplier = supplierList.data?.content.find((x) => x.id === p.supplierId)?.name ?? 'Supplier';
  const category = (id: string | null) => categoryList.data?.content.find((x) => x.id === id)?.name;
  const nonZero = (v: string) => toUnits(v, 2) !== 0n;

  return (
    <Screen
      title={p.reference}
      subtitle={`${supplier} · ${formatIsoDate(p.procurementDate)}`}
      left={<IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />}
      right={<Badge label={statusLabel(p.status)} tone={p.status === 'REVERSED' ? 'neutral' : 'success'} />}>
      {p.items.map((it) => (
        <Card key={it.id}>
          <View
            style={{
              paddingHorizontal: space.lg,
              paddingTop: space.md,
              paddingBottom: space.xs,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: space.md,
            }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="headline">
                {productName(it.chickenTypeId)}
              </Text>
              <Text variant="caption">
                {formatKg(it.paidWeightKg)} × {formatRupees(it.purchasePricePerKg)}
                {it.quantity ? ` · ${it.quantity} birds` : ''}
              </Text>
            </View>
            <Badge label={`${formatRupees(it.landedCostPerKg)}/kg landed`} tone="success" />
          </View>
          <Lines>
            {[
              <Line key="p" label="Purchase" value={formatRupees(it.purchaseValue)} />,
              nonZero(it.commissionAmount) ? (
                <Line
                  key="c"
                  label={`Commission · ${COMMISSION[it.commissionMethod](it.commissionValue ?? '0')}`}
                  value={formatRupees(it.commissionAmount)}
                />
              ) : null,
              nonZero(it.allocatedExpenseAmount) ? (
                <Line key="e" label="Costs share" value={formatRupees(it.allocatedExpenseAmount)} />
              ) : null,
            ]}
          </Lines>
        </Card>
      ))}

      <Card>
        <Lines>
          {[
            ...p.expenses.map((e) => (
              <Line
                key={e.id}
                label={[category(e.categoryId), e.description].filter(Boolean).join(' · ') || 'Cost'}
                value={formatRupees(e.amount)}
              />
            )),
            <Line key="t" label={`Total cost · ${formatKg(p.paidWeightKg)}`} value={formatRupees(p.totalCost)} strong />,
          ]}
        </Lines>
      </Card>

      {p.notes ? (
        <Card style={{ padding: space.lg, gap: 4 }}>
          <Text variant="caption">Notes</Text>
          <Text>{p.notes}</Text>
        </Card>
      ) : null}

      <Notice text="Stock was added to the warehouse when this purchase was saved. Costs are shared across items by weight." />
    </Screen>
  );
}
