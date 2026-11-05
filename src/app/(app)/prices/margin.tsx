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
import { Button, Card, Separator, TextLink } from '@/components/ui';
import { currentMargin, useMarginRules, useSetMargin } from '@/features/prices-api';
import { formatPercent, isDecimal, toFixedString } from '@/lib/decimal';
import { space } from '@/theme/tokens';

/** Example on Rs 100 of landed cost, worked in integer cents to avoid float rounding. */
function example(percent: string): string {
  const [w, f = ''] = toFixedString(percent).split('.');
  const pctHundredths = Number(w) * 100 + Number(f.padEnd(2, '0').slice(0, 2));
  const cents = 10000 + pctHundredths; // 100.00 + percent% of 100.00
  return `Rs 100.00 landed → Rs ${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')} to the branch`;
}

export default function SetMargin() {
  const productList = products.useList('', true);
  const branchList = branches.useList('', true);
  const [productId, setProductId] = useState<string | null>(null);
  const [scope, setScope] = useState<'all' | 'one'>('all');
  const [branchId, setBranchId] = useState<string | null>(null);
  const [markup, setMarkup] = useState('');
  const starts = useStarts();
  const [touched, setTouched] = useState(false);

  const targetBranch = scope === 'one' ? branchId : null;
  const rules = useMarginRules(productId).data;
  const now = currentMargin(rules, targetBranch) ?? (targetBranch ? currentMargin(rules, null) : null);
  const save = useSetMargin();
  const idem = useIdempotencyKey();
  const server = fieldErrors(save.error);

  const errors = {
    product: !productId ? 'Choose a product' : undefined,
    branch: scope === 'one' && !branchId ? 'Choose a branch' : undefined,
    markup: !isDecimal(markup) ? 'Enter a markup, e.g. 8 or 7.5' : undefined,
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
          markupPercent: toFixedString(markup),
          effectiveFrom: starts.effectiveFrom(),
        },
        key: idem.key,
      },
      { onSuccess: () => router.back(), onError: idem.onError },
    );
  }

  return (
    <Screen
      title="Change margin"
      left={<TextLink title="Cancel" onPress={() => router.back()} />}
      bodyGap={16}
      footer={<Button title="Save margin" onPress={submit} loading={save.isPending} />}>
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
        <DecimalField
          label="Markup % on landed cost"
          value={markup}
          onChangeText={setMarkup}
          placeholder="0.00"
          error={server.markupPercent ?? show('markup')}
        />
        <StartsField starts={starts} />
      </Card>

      {productId ? (
        <Card>
          <View style={{ minHeight: 48, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="subhead">Margin now</Text>
            <Text variant="mono">{now ? formatPercent(now.markupPercent) : '0.00%'}</Text>
          </View>
          {isDecimal(markup) ? (
            <>
              <Separator />
              <View style={{ minHeight: 48, paddingHorizontal: space.lg, justifyContent: 'center' }}>
                <Text variant="bodyMedium">{example(markup)}</Text>
              </View>
            </>
          ) : null}
        </Card>
      ) : null}

      <Text variant="caption" style={{ paddingHorizontal: space.xs }}>
        Margin is added to the landed cost when you send stock to a branch. Dispatches already sent keep their price.
      </Text>
    </Screen>
  );
}
