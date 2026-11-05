import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { branches, products } from '@/api/resources';
import { FormError, fieldErrors, useIdempotencyKey } from '@/components/form';
import { DecimalField } from '@/components/money-field';
import { Segmented, SelectField } from '@/components/pickers';
import { Screen } from '@/components/screen';
import { StartsField, useStarts } from '@/components/starts-field';
import { Text } from '@/components/text';
import { Button, Card, TextLink } from '@/components/ui';
import { useCurrentPrice, useSetPrice } from '@/features/prices-api';
import { isDecimal, toFixedString } from '@/lib/decimal';
import { formatRupees } from '@/lib/format';
import { space } from '@/theme/tokens';
import { savedAndBack } from '@/components/motion';

export default function SetPrice() {
  const productList = products.useList('', true);
  const branchList = branches.useList('', true);
  const [productId, setProductId] = useState<string | null>(null);
  const [scope, setScope] = useState<'all' | 'one'>('all');
  const [branchId, setBranchId] = useState<string | null>(null);
  const [buying, setBuying] = useState('');
  const [selling, setSelling] = useState('');
  const starts = useStarts();
  const [touched, setTouched] = useState(false);

  const targetBranch = scope === 'one' ? branchId : null;
  const current = useCurrentPrice(productId, targetBranch).data;
  const save = useSetPrice();
  const idem = useIdempotencyKey();
  const server = fieldErrors(save.error);

  const errors = {
    product: !productId ? 'Choose a product' : undefined,
    branch: scope === 'one' && !branchId ? 'Choose a branch' : undefined,
    buying: !isDecimal(buying) ? 'Enter the buying price per kg' : undefined,
    selling: !isDecimal(selling) ? 'Enter the selling price per kg' : undefined,
    starts: starts.valid ? undefined : 'Enter a date as yyyy-mm-dd',
  };
  const show = (k: keyof typeof errors) => (touched ? errors[k] : undefined);

  function submit() {
    setTouched(true);
    if (Object.values(errors).some(Boolean) || !productId) return;
    save.mutate(
      {
        input: {
          chickenTypeId: productId,
          branchId: targetBranch,
          supplierId: null,
          purchasePricePerKg: toFixedString(buying),
          sellingPricePerKg: toFixedString(selling),
          effectiveFrom: starts.effectiveFrom(),
        },
        key: idem.key,
      },
      { onSuccess: () => savedAndBack('Price saved'), onError: idem.onError },
    );
  }

  return (
    <Screen
      title="Set price"
      left={<TextLink title="Cancel" onPress={() => router.back()} />}
      bodyGap={16}
      footer={<Button title="Save price" onPress={submit} loading={save.isPending} />}>
      <FormError error={save.error} />
      <Card style={{ padding: space.lg, gap: 14 }}>
        <SelectField
          label="Product"
          compact
          value={productId}
          onChange={setProductId}
          options={(productList.data?.content ?? []).map((p) => ({ value: p.id, label: p.name }))}
          error={show('product')}
        />
        <Segmented
          label="Applies to"
          value={scope}
          onChange={setScope}
          options={[
            { value: 'all', label: 'All branches' },
            { value: 'one', label: 'One branch' },
          ]}
        />
        {scope === 'one' ? (
          <SelectField
            label="Branch"
            hideLabel
            compact
            value={branchId}
            onChange={setBranchId}
            placeholder="Choose a branch"
            options={(branchList.data?.content ?? []).map((b) => ({ value: b.id, label: b.name, detail: b.code }))}
            error={show('branch')}
          />
        ) : null}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <DecimalField
              label="Buying Rs / kg"
              value={buying}
              onChangeText={setBuying}
              placeholder="0.00"
              hint={current ? `Now ${formatRupees(current.purchasePricePerKg)}` : undefined}
              error={server.purchasePricePerKg ?? show('buying')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <DecimalField
              label="Selling Rs / kg"
              value={selling}
              onChangeText={setSelling}
              placeholder="0.00"
              hint={current ? `Now ${formatRupees(current.sellingPricePerKg)}` : undefined}
              error={server.sellingPricePerKg ?? show('selling')}
            />
          </View>
        </View>
        <StartsField starts={starts} />
      </Card>
      <Text variant="caption" style={{ paddingHorizontal: space.xs }}>
        The new price is used for sales from when it starts. Earlier sales keep the price they were recorded at.
      </Text>
    </Screen>
  );
}
