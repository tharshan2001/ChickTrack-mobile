import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useAuth } from '@/auth/auth-context';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Card, ListRow, SectionHeader, Separator } from '@/components/ui';
import { branches, expenseCategories, products, suppliers } from '@/api/resources';
import { useCurrentPriceGrid } from '@/features/prices-api';
import { useUsers } from '@/features/users-api';
import { colors, fonts, space } from '@/theme/tokens';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

const count = (n: number | undefined) =>
  n === undefined ? null : (
    <Text variant="monoSmall" style={{ color: colors.secondary }}>
      {n}
    </Text>
  );

export default function More() {
  const { user, isOwner, signOut } = useAuth();
  const productList = products.useList('', true);
  const branchList = branches.useList('', true);
  const counts = {
    products: productList.data?.totalElements,
    branches: branchList.data?.totalElements,
    suppliers: suppliers.useList('', true).data?.totalElements,
    categories: expenseCategories.useList('', true).data?.totalElements,
    users: useUsers('', isOwner).data?.totalElements,
  };

  // A branch can only sell a chicken type once its selling price is set.
  const priceGrid = useCurrentPriceGrid(
    (productList.data?.content ?? []).map((p) => p.id),
    (branchList.data?.content ?? []).map((b) => b.id),
  );
  const pricesToSet = (productList.data?.content ?? []).filter((p) =>
    (branchList.data?.content ?? []).some((b) => !priceGrid.get(p.id, b.id)?.data?.sellingPricePerKg),
  ).length;

  return (
    <Screen title="Setup" titleVariant="tabTitle" bodyGap={space.xl}>
      <View style={{ paddingHorizontal: space.xs, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: colors.tint,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text variant="headline" style={{ color: colors.accentPressed, fontFamily: fonts.bodySemiBold, fontSize: 18 }}>
            {user ? initials(user.fullName) : ''}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="headline" numberOfLines={1}>
            {user?.fullName ?? '…'}
          </Text>
          <Text variant="monoSmall" style={{ color: colors.secondary }} numberOfLines={1}>
            {user ? `@${user.username}` : ''}
          </Text>
        </View>
      </View>

      <View style={{ gap: space.sm }}>
        <SectionHeader title="Business" size="small" />
        <Card>
          <ListRow
            title="Prices & margins"
            right={
              pricesToSet > 0 ? (
                <Text variant="caption" style={{ color: colors.warning }}>
                  {pricesToSet} to set
                </Text>
              ) : null
            }
            chevron
            compact
            onPress={() => router.push('/prices')}
          />
          <Separator />
          <ListRow title="Branches" right={count(counts.branches)} chevron compact onPress={() => router.push('/branches')} />
          <Separator />
          <ListRow title="Suppliers" right={count(counts.suppliers)} chevron compact onPress={() => router.push('/suppliers')} />
          <Separator />
          <ListRow title="Products" right={count(counts.products)} chevron compact onPress={() => router.push('/products')} />
          <Separator />
          <ListRow
            title="Expense categories"
            right={count(counts.categories)}
            chevron
            compact
            onPress={() => router.push('/expense-categories')}
          />
        </Card>
      </View>

      <View style={{ gap: space.sm }}>
        <SectionHeader title="Insights" size="small" />
        <Card>
          <ListRow title="Reports & exports" chevron compact onPress={() => router.push('/reports')} />
        </Card>
      </View>

      <View style={{ gap: space.sm }}>
        <SectionHeader title="Account" size="small" />
        <Card>
          {isOwner ? (
            <>
              <ListRow title="Users & roles" right={count(counts.users)} chevron compact onPress={() => router.push('/users')} />
              <Separator />
            </>
          ) : null}
          <ListRow title="Change password" chevron compact onPress={() => router.push('/change-password')} />
          <Separator />
          <Pressable
            accessibilityRole="button"
            onPress={signOut}
            style={({ pressed }) => [
              { minHeight: 52, paddingHorizontal: space.lg, justifyContent: 'center' },
              pressed && { backgroundColor: colors.field },
            ]}>
            <Text variant="bodyMedium" style={{ color: colors.danger }}>
              Sign out
            </Text>
          </Pressable>
        </Card>
      </View>
    </Screen>
  );
}
