import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Switch, View } from 'react-native';

import { errorMessage, newIdempotencyKey, nextKeyAfter } from '@/api/client';
import type { ChickenType } from '@/api/types';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Button, Card, ErrorBanner, TextLink } from '@/components/ui';
import { useProduct, useSetProductActive, useUpdateProduct } from '@/features/products/api';
import { ProductForm, useProductForm } from '@/features/products/product-form';
import { colors, space } from '@/theme/tokens';

export default function EditProductRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useProduct(id);

  if (query.data) return <EditProduct product={query.data} />;
  return (
    <Screen title="Product" left={<TextLink title="Cancel" onPress={() => router.back()} />}>
      {query.isError ? (
        <ErrorBanner message={errorMessage(query.error)} onRetry={query.refetch} />
      ) : (
        <ActivityIndicator color={colors.accent} />
      )}
    </Screen>
  );
}

function EditProduct({ product }: { product: ChickenType }) {
  const form = useProductForm({ name: product.name, description: product.description ?? '' });
  const update = useUpdateProduct(product.id);
  const setActive = useSetProductActive(product.id);
  const [key, setKey] = useState(newIdempotencyKey);

  function save() {
    form.setTouched(true);
    if (!form.valid) return;
    update.mutate(
      { input: form.toInput(), key },
      {
        onSuccess: () => router.back(),
        onError: (e) => setKey(nextKeyAfter(e, key)),
      },
    );
  }

  return (
    <Screen
      title="Edit product"
      left={<TextLink title="Cancel" onPress={() => router.back()} />}
      footer={<Button title="Save changes" onPress={save} loading={update.isPending} />}>
      <ProductForm form={form} error={update.error} />
      <Card style={{ padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyMedium">Active</Text>
          <Text variant="caption">
            {product.active ? 'Shown in the purchase picker' : 'Hidden from new purchases'}
          </Text>
        </View>
        <Switch
          accessibilityLabel="Active"
          value={setActive.isPending ? !product.active : product.active}
          disabled={setActive.isPending}
          onValueChange={(v) => setActive.mutate(v)}
          trackColor={{ true: colors.success, false: colors.separator }}
        />
      </Card>
      {setActive.isError ? <ErrorBanner message={errorMessage(setActive.error)} /> : null}
    </Screen>
  );
}
