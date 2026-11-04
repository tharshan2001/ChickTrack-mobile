import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useAuth } from '@/auth/auth-context';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Badge, Card, ListRow, SectionHeader, Separator } from '@/components/ui';
import { branches, expenseCategories, products, suppliers } from '@/api/resources';
import { colors, space } from '@/theme/tokens';

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
  const counts = {
    products: products.useList('', true).data?.totalElements,
    branches: branches.useList('', true).data?.totalElements,
    suppliers: suppliers.useList('', true).data?.totalElements,
    categories: expenseCategories.useList('', true).data?.totalElements,
  };

  return (
    <Screen title="More">
      <Card style={{ padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: colors.tint,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text variant="headline" style={{ color: colors.accentPressed }}>
            {user ? initials(user.fullName) : ''}
          </Text>
        </View>
        <View style={{ flex: 1, gap: space.xs, alignItems: 'flex-start' }}>
          <Text variant="headline">
            {user?.fullName ?? '…'}
          </Text>
          {isOwner ? <Badge label="Owner · full access" tone="brand" /> : null}
        </View>
      </Card>

      <View style={{ gap: space.sm }}>
        <SectionHeader title="Setup" />
        <Card>
          <ListRow title="Prices & margins" chevron onPress={() => router.push('/prices')} />
          <Separator />
          <ListRow title="Branches" right={count(counts.branches)} chevron onPress={() => router.push('/branches')} />
          <Separator />
          <ListRow title="Suppliers" right={count(counts.suppliers)} chevron onPress={() => router.push('/suppliers')} />
          <Separator />
          <ListRow title="Products" right={count(counts.products)} chevron onPress={() => router.push('/products')} />
          <Separator />
          <ListRow
            title="Expense categories"
            right={count(counts.categories)}
            chevron
            onPress={() => router.push('/expense-categories')}
          />
        </Card>
      </View>

      <View style={{ gap: space.sm }}>
        <SectionHeader title="Account" />
        <Card>
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
