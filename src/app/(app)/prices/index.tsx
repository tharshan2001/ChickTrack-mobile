import { router } from 'expo-router';
import { Fragment } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { branches, products } from '@/api/resources';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Badge, Button, Card, ErrorBanner, IconButton, Notice, Separator } from '@/components/ui';
import { currentMargin, useCurrentPriceGrid, useMarginRulesFor } from '@/features/prices-api';
import { formatPercent } from '@/lib/decimal';
import { formatRupees } from '@/lib/format';
import { colors, space } from '@/theme/tokens';

function Row({ label, value, muted }: { label: string; value: React.ReactNode; muted?: boolean }) {
  return (
    <View
      style={{
        minHeight: 48,
        paddingHorizontal: space.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: space.md,
      }}>
      <Text style={muted ? { color: colors.secondary } : undefined} numberOfLines={1}>
        {label}
      </Text>
      {value}
    </View>
  );
}

const notSet = <Badge label="Not set" tone="warning" />;
const money = (v: string) => <Text variant="mono">{formatRupees(v)}</Text>;

export default function Prices() {
  const productList = products.useList('', true);
  const branchList = branches.useList('', true);
  const ps = productList.data?.content ?? [];
  const bs = branchList.data?.content ?? [];
  const grid = useCurrentPriceGrid(
    ps.map((p) => p.id),
    bs.map((b) => b.id),
  );
  const margins = useMarginRulesFor(ps.map((p) => p.id));

  const loading = productList.isPending || branchList.isPending;
  const error = productList.error ?? branchList.error ?? grid.error;

  return (
    <Screen
      title="Prices & margins"
      subtitle="In force today · changes never alter past documents"
      left={<IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button title="Change margin" variant="secondary" onPress={() => router.push('/prices/margin')} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Set a price" onPress={() => router.push('/prices/set')} />
          </View>
        </View>
      }>
      {error ? (
        <ErrorBanner
          message={errorMessage(error)}
          onRetry={() => {
            productList.refetch();
            branchList.refetch();
            grid.refetch();
          }}
        />
      ) : null}

      {loading ? <ActivityIndicator color={colors.accent} /> : null}

      {!loading && ps.length === 0 ? (
        <Card style={{ padding: space.xl, alignItems: 'center', gap: space.sm }}>
          <Text variant="bodyMedium">No active products</Text>
          <Text variant="caption" style={{ textAlign: 'center' }}>
            Add a product in More → Products, then set its prices here.
          </Text>
        </Card>
      ) : null}

      {ps.map((p) => {
        const company = grid.get(p.id, null);
        const margin = currentMargin(margins(p.id)?.data);
        const marginOn = margin && margin.markupPercent.replace(/[0.]/g, '') !== '';
        return (
          <Card key={p.id}>
            <View
              style={{
                paddingHorizontal: space.lg,
                paddingTop: space.lg,
                paddingBottom: space.sm,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
              <Text variant="bodyMedium" style={{ fontSize: 16 }}>
                {p.name}
              </Text>
              <Badge
                label={`Margin ${margin ? formatPercent(margin.markupPercent) : '0%'}`}
                tone={marginOn ? 'success' : 'neutral'}
              />
            </View>
            <Row
              label="Buying price"
              muted
              value={
                company?.isPending ? (
                  <ActivityIndicator color={colors.secondary} />
                ) : company?.data ? (
                  money(company.data.purchasePricePerKg)
                ) : (
                  notSet
                )
              }
            />
            {bs.map((b) => {
              const price = grid.get(p.id, b.id);
              return (
                <Fragment key={b.id}>
                  <Separator />
                  <Row
                    label={`Sell · ${b.name}`}
                    value={
                      price?.isPending ? (
                        <ActivityIndicator color={colors.secondary} />
                      ) : price?.data ? (
                        money(price.data.sellingPricePerKg)
                      ) : (
                        notSet
                      )
                    }
                  />
                </Fragment>
              );
            })}
          </Card>
        );
      })}

      {ps.length ? (
        <Notice text="A branch can't record sales of a product until its selling price is set. Margin is added to landed cost when you dispatch." />
      ) : null}
    </Screen>
  );
}
