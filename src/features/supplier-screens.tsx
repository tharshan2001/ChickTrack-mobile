import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { suppliers } from '@/api/resources';
import type { Supplier, SupplierInput } from '@/api/types';
import {
  ActiveSwitch,
  EditLoader,
  FormError,
  fieldErrors,
  optional,
  useFormValues,
  useIdempotencyKey,
} from '@/components/form';
import { Screen } from '@/components/screen';
import { Button, Card, Field, TextLink } from '@/components/ui';
import { space } from '@/theme/tokens';

type Values = {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  paymentTerms: string;
};

const empty: Values = { name: '', contactPerson: '', phone: '', email: '', address: '', paymentTerms: '' };

const fromSupplier = (s: Supplier): Values => ({
  name: s.name,
  contactPerson: s.contactPerson ?? '',
  phone: s.phone ?? '',
  email: s.email ?? '',
  address: s.address ?? '',
  paymentTerms: s.paymentTerms ?? '',
});

const toInput = (v: Values): SupplierInput => ({
  name: v.name.trim(),
  contactPerson: optional(v.contactPerson),
  phone: optional(v.phone),
  email: optional(v.email),
  address: optional(v.address),
  paymentTerms: optional(v.paymentTerms),
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(v: Values) {
  return {
    name: v.name.trim() ? undefined : 'Enter a name',
    email: v.email.trim() && !EMAIL.test(v.email.trim()) ? 'Enter a valid email' : undefined,
  };
}

function SupplierForm({ form, error }: { form: ReturnType<typeof useFormValues<Values>>; error: unknown }) {
  const server = fieldErrors(error);
  const local = form.touched ? validate(form.values) : {};
  const err = (k: keyof Values) => server[k] ?? (local as Record<string, string | undefined>)[k];
  return (
    <>
      <FormError error={error} />
      <Card style={{ padding: space.lg, gap: space.lg }}>
        <Field
          label="Name"
          value={form.values.name}
          onChangeText={form.set('name')}
          maxLength={150}
          autoCapitalize="words"
          hint="Must be unique."
          error={err('name')}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Contact person"
              value={form.values.contactPerson}
              onChangeText={form.set('contactPerson')}
              maxLength={150}
              autoCapitalize="words"
              error={err('contactPerson')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Phone"
              value={form.values.phone}
              onChangeText={form.set('phone')}
              maxLength={32}
              inputMode="tel"
              error={err('phone')}
            />
          </View>
        </View>
        <Field
          label="Email (optional)"
          value={form.values.email}
          onChangeText={form.set('email')}
          maxLength={150}
          inputMode="email"
          autoCapitalize="none"
          autoCorrect={false}
          error={err('email')}
        />
        <Field
          label="Address (optional)"
          value={form.values.address}
          onChangeText={form.set('address')}
          multiline
          error={err('address')}
        />
        <Field
          label="Payment terms (optional)"
          value={form.values.paymentTerms}
          onChangeText={form.set('paymentTerms')}
          maxLength={255}
          placeholder="e.g. Cash on delivery"
          error={err('paymentTerms')}
        />
      </Card>
    </>
  );
}

const isValid = (v: Values) => Object.values(validate(v)).every((e) => !e);

export function AddSupplierScreen() {
  const form = useFormValues(empty);
  const create = suppliers.useCreate();
  const idem = useIdempotencyKey();

  function save() {
    form.setTouched(true);
    if (!isValid(form.values)) return;
    create.mutate({ input: toInput(form.values), key: idem.key }, { onSuccess: () => router.back(), onError: idem.onError });
  }

  return (
    <Screen
      title="Add supplier"
      left={<TextLink title="Cancel" onPress={() => router.back()} />}
      footer={<Button title="Save supplier" onPress={save} loading={create.isPending} />}>
      <SupplierForm form={form} error={create.error} />
    </Screen>
  );
}

export function EditSupplierScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <EditLoader title="Edit supplier" query={suppliers.useOne(id)}>
      {(s) => <EditSupplier supplier={s} />}
    </EditLoader>
  );
}

function EditSupplier({ supplier }: { supplier: Supplier }) {
  const form = useFormValues(fromSupplier(supplier));
  const update = suppliers.useUpdate(supplier.id);
  const setActive = suppliers.useSetActive(supplier.id);
  const idem = useIdempotencyKey();

  function save() {
    form.setTouched(true);
    if (!isValid(form.values)) return;
    update.mutate({ input: toInput(form.values), key: idem.key }, { onSuccess: () => router.back(), onError: idem.onError });
  }

  return (
    <Screen
      title="Edit supplier"
      left={<TextLink title="Cancel" onPress={() => router.back()} />}
      footer={<Button title="Save changes" onPress={save} loading={update.isPending} />}>
      <SupplierForm form={form} error={update.error} />
      <ActiveSwitch
        active={supplier.active}
        mutation={setActive}
        onText="Shown when you record a purchase"
        offText="Hidden from new purchases"
      />
    </Screen>
  );
}
