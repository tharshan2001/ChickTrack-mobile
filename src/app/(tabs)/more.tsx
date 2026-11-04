import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useAuth } from '@/auth/auth-context';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Badge, Card, ListRow, SectionHeader, Separator } from '@/components/ui';
import { useProducts } from '@/features/products/api';
import { colors, space } from '@/theme/tokens';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

const soon = <Text variant="caption">Soon</Text>;

export default function More() {
  const { user, isOwner, signOut } = useAuth();
  const products = useProducts('');

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
          <Text variant="bodyMedium" style={{ color: colors.accentPressed, fontSize: 16 }}>
            {user ? initials(user.fullName) : ''}
          </Text>
        </View>
        <View style={{ flex: 1, gap: space.xs, alignItems: 'flex-start' }}>
          <Text variant="bodyMedium" style={{ fontSize: 16 }}>
            {user?.fullName ?? '…'}
          </Text>
          {isOwner ? <Badge label="Owner · full access" tone="brand" /> : null}
        </View>
      </Card>

      <View style={{ gap: space.sm }}>
        <SectionHeader title="Setup" />
        <Card>
          <ListRow
            title="Products"
            right={<Text variant="mono" style={{ fontSize: 13, color: colors.secondary }}>{products.data?.totalElements ?? ''}</Text>}
            chevron
            onPress={() => router.push('/products')}
          />
          <Separator />
          <ListRow title="Prices & margins" right={soon} />
          <Separator />
          <ListRow title="Branches" right={soon} />
          <Separator />
          <ListRow title="Suppliers" right={soon} />
          <Separator />
          <ListRow title="Expense categories" right={soon} />
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
