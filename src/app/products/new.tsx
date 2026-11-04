import { router } from 'expo-router';
import { useState } from 'react';

import { newIdempotencyKey, nextKeyAfter } from '@/api/client';
import { Screen } from '@/components/screen';
import { Button, Notice, TextLink } from '@/components/ui';
import { useCreateProduct } from '@/features/products/api';
import { ProductForm, useProductForm } from '@/features/products/product-form';

export default function AddProduct() {
  const form = useProductForm();
  const create = useCreateProduct();
  // Reused when retrying after a dropped connection, so the product isn't created twice.
  const [key, setKey] = useState(newIdempotencyKey);

  function save() {
    form.setTouched(true);
    if (!form.valid) return;
    create.mutate({ input: form.toInput(), key }, { onSuccess: () => router.back(), onError: (e) => setKey(nextKeyAfter(e, key)) });
  }

  return (
    <Screen
      title="Add product"
      left={<TextLink title="Cancel" onPress={() => router.back()} />}
      footer={<Button title="Save product" onPress={save} loading={create.isPending} />}>
      <ProductForm form={form} error={create.error} />
      <Notice text="New products start active. Set its buying and selling prices in Prices & margins before branches can record sales." />
    </Screen>
  );
}
