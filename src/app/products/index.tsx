import { router } from 'expo-router';
import { Fragment, useDeferredValue, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { errorMessage } from '@/api/client';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Badge, Card, ErrorBanner, IconButton, ListRow, Notice, SearchField, Separator } from '@/components/ui';
import { useProducts } from '@/features/products/api';
import { colors, space } from '@/theme/tokens';

export default function Products() {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  // The product list is short (one row per chicken type), so a single page of 100 covers it.
  const query = useProducts(deferredSearch);
  const items = query.data?.content ?? [];

  return (
    <Screen
      title="Products"
      subtitle="Chicken types you buy, stock and sell"
      left={<IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />}
      right={<IconButton icon="plus" label="Add product" filled onPress={() => router.push('/products/new')} />}>
      <SearchField
        placeholder="Search products"
        accessibilityLabel="Search products"
        value={search}
        onChangeText={setSearch}
      />

      {query.isError ? <ErrorBanner message={errorMessage(query.error)} onRetry={query.refetch} /> : null}

      {query.isPending ? (
        <ActivityIndicator color={colors.accent} />
      ) : items.length ? (
        <>
          <Card>
            {items.map((item, i) => (
              <Fragment key={item.id}>
                {i > 0 ? <Separator /> : null}
                <ListRow
                  title={item.name}
                  subtitle={item.description ?? undefined}
                  muted={!item.active}
                  right={
                    <Badge label={item.active ? 'Active' : 'Inactive'} tone={item.active ? 'success' : 'neutral'} />
                  }
                  onPress={() => router.push({ pathname: '/products/[id]', params: { id: item.id } })}
                />
              </Fragment>
            ))}
          </Card>
          <Notice text="Inactive products are hidden from the purchase picker. Their history and any stock you hold stay as they are." />
        </>
      ) : query.isSuccess ? (
        <Card style={{ padding: space.xl, alignItems: 'center', gap: space.sm }}>
          <Text variant="bodyMedium">{deferredSearch ? 'No matches' : 'No products yet'}</Text>
          <Text variant="caption" style={{ textAlign: 'center' }}>
            {deferredSearch ? 'Try another name.' : 'Add the chicken types you buy, like Broiler or Layer.'}
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}
