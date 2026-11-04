import { router } from 'expo-router';
import { View } from 'react-native';

import { useAuth } from '@/auth/auth-context';
import { BusinessDate } from '@/lib/format';
import { ComingSoon } from '@/components/coming-soon';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Card, ListRow, SectionHeader, Separator } from '@/components/ui';
import { useProducts } from '@/features/products/api';
import { space } from '@/theme/tokens';

export default function Home() {
  const { user } = useAuth();
  const products = useProducts('', true);
  const firstName = user?.fullName.split(' ')[0];

  return (
    <Screen title={firstName ? `Hi, ${firstName}` : 'Home'} subtitle={BusinessDate.today()}>
      <View style={{ gap: space.sm }}>
        <SectionHeader title="Quick actions" />
        <Card>
          <ListRow
            title="Products"
            subtitle={
              products.data ? `${products.data.totalElements} active chicken types` : 'Chicken types you buy and sell'
            }
            chevron
            onPress={() => router.push('/products')}
          />
          <Separator />
          <ListRow title="New product" subtitle="Add a chicken type" chevron onPress={() => router.push('/products/new')} />
        </Card>
      </View>
      <View style={{ gap: space.sm }}>
        <SectionHeader title="Today" />
        <ComingSoon icon="bar-chart-2" text="Stock on hand, dispatches and branch balances will show here." />
      </View>
      <Text variant="caption" style={{ textAlign: 'center' }}>
        Signed in as {user?.username ?? '…'}
      </Text>
    </Screen>
  );
}
