import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { branches } from '@/api/resources';
import type { Branch } from '@/api/types';
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
import { Text } from '@/components/text';
import { Button, Card, Field, Notice, TextLink } from '@/components/ui';
import { colors, fonts, space } from '@/theme/tokens';

type Values = { code: string; name: string; phone: string; address: string };

const CODE = /^[A-Z0-9-]{1,32}$/;

function validate(v: Values, withCode: boolean) {
  return {
    code: !withCode ? undefined : !v.code ? 'Enter a code' : !CODE.test(v.code) ? 'Letters, numbers and - only' : undefined,
    name: v.name.trim() ? undefined : 'Enter a name',
  };
}

function BranchForm({
  form,
  error,
  lockedCode,
}: {
  form: ReturnType<typeof useFormValues<Values>>;
  error: unknown;
  /** Set when editing: the code can't change after creation. */
  lockedCode?: string;
}) {
  const server = fieldErrors(error);
  const local: Record<string, string | undefined> = form.touched ? validate(form.values, !lockedCode) : {};
  const err = (k: keyof Values) => server[k] ?? local[k];
  return (
    <>
      <FormError error={error} />
      <Card style={{ padding: space.lg, gap: space.lg }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ width: 110 }}>
            {lockedCode ? (
              <View style={{ gap: 6 }}>
                <Text variant="caption">Code</Text>
                <View style={{ height: 48, justifyContent: 'center', paddingHorizontal: 2 }}>
                  <Text variant="mono" style={{ fontSize: 16, color: colors.secondary }}>
                    {lockedCode}
                  </Text>
                </View>
              </View>
            ) : (
              <Field
                label="Code"
                value={form.values.code}
                onChangeText={(t) => form.set('code')(t.toUpperCase().replace(/\s/g, ''))}
                maxLength={32}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="KDY"
                style={{ fontFamily: fonts.mono }}
                error={err('code')}
              />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Name"
              value={form.values.name}
              onChangeText={form.set('name')}
              maxLength={150}
              autoCapitalize="words"
              error={err('name')}
            />
          </View>
        </View>
        <Field
          label="Phone (optional)"
          value={form.values.phone}
          onChangeText={form.set('phone')}
          maxLength={32}
          inputMode="tel"
          error={err('phone')}
        />
        <Field
          label="Address (optional)"
          value={form.values.address}
          onChangeText={form.set('address')}
          multiline
          error={err('address')}
        />
      </Card>
    </>
  );
}

const ok = (v: Values, withCode: boolean) => Object.values(validate(v, withCode)).every((e) => !e);

export function AddBranchScreen() {
  const form = useFormValues<Values>({ code: '', name: '', phone: '', address: '' });
  const create = branches.useCreate();
  const idem = useIdempotencyKey();

  function save() {
    form.setTouched(true);
    if (!ok(form.values, true)) return;
    const v = form.values;
    create.mutate(
      { input: { code: v.code, name: v.name.trim(), phone: optional(v.phone), address: optional(v.address) }, key: idem.key },
      { onSuccess: () => router.back(), onError: idem.onError },
    );
  }

  return (
    <Screen
      title="Add branch"
      left={<TextLink title="Cancel" onPress={() => router.back()} />}
      footer={<Button title="Save branch" onPress={save} loading={create.isPending} />}>
      <BranchForm form={form} error={create.error} />
      <Notice text="The code can't be changed later. It appears on dispatch numbers and reports. Set selling prices for this branch before it records sales." />
    </Screen>
  );
}

export function EditBranchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <EditLoader title="Edit branch" query={branches.useOne(id)}>
      {(b) => <EditBranch branch={b} />}
    </EditLoader>
  );
}

function EditBranch({ branch }: { branch: Branch }) {
  const form = useFormValues<Values>({
    code: branch.code,
    name: branch.name,
    phone: branch.phone ?? '',
    address: branch.address ?? '',
  });
  const update = branches.useUpdate(branch.id);
  const setActive = branches.useSetActive(branch.id);
  const idem = useIdempotencyKey();

  function save() {
    form.setTouched(true);
    if (!ok(form.values, false)) return;
    const v = form.values;
    update.mutate(
      { input: { name: v.name.trim(), phone: optional(v.phone), address: optional(v.address) }, key: idem.key },
      { onSuccess: () => router.back(), onError: idem.onError },
    );
  }

  return (
    <Screen
      title="Edit branch"
      left={<TextLink title="Cancel" onPress={() => router.back()} />}
      footer={<Button title="Save changes" onPress={save} loading={update.isPending} />}>
      <BranchForm form={form} error={update.error} lockedCode={branch.code} />
      <ActiveSwitch
        active={branch.active}
        mutation={setActive}
        onText="Can receive stock and record sales"
        offText="Closed: no new dispatches or sales"
      />
    </Screen>
  );
}
