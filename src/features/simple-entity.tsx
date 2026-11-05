import { router, useLocalSearchParams } from 'expo-router';

import type { createCrud } from '@/api/crud';
import type { ChickenType, ChickenTypeInput } from '@/api/types';
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
import { Button, Card, Field, Notice, TextLink } from '@/components/ui';
import { space } from '@/theme/tokens';
import { savedAndBack } from '@/components/motion';

/**
 * Add and edit screens for resources that are just a name and a description
 * (products / chicken types, expense categories).
 */
type Crud = ReturnType<typeof createCrud<ChickenType, ChickenTypeInput>>;

type Copy = {
  noun: string;
  addTitle: string;
  editTitle: string;
  namePlaceholder: string;
  nameHint?: string;
  /** Forms use 4px below the title; list-adjacent forms use 8px. */
  titleGap?: number;
  addNote?: string;
  activeOn: string;
  activeOff: string;
};

function NameDescriptionForm({
  form,
  error,
  copy,
}: {
  form: ReturnType<typeof useFormValues<{ name: string; description: string }>>;
  error: unknown;
  copy: Copy;
}) {
  const errs = fieldErrors(error);
  return (
    <>
      <FormError error={error} />
      <Card style={{ padding: space.lg, gap: space.lg }}>
        <Field
          label="Name"
          value={form.values.name}
          onChangeText={form.set('name')}
          placeholder={copy.namePlaceholder}
          maxLength={100}
          autoCapitalize="words"
          hint={copy.nameHint ?? 'Must be unique.'}
          error={errs.name ?? (form.touched && !form.values.name.trim() ? 'Enter a name' : undefined)}
        />
        <Field
          label="Description (optional)"
          value={form.values.description}
          onChangeText={form.set('description')}
          maxLength={255}
          multiline
          error={errs.description}
        />
      </Card>
    </>
  );
}

const toInput = (v: { name: string; description: string }): ChickenTypeInput => ({
  name: v.name.trim(),
  description: optional(v.description),
});

export function AddSimpleEntity({ crud, copy }: { crud: Crud; copy: Copy }) {
  const form = useFormValues({ name: '', description: '' });
  const create = crud.useCreate();
  const idem = useIdempotencyKey();

  function save() {
    form.setTouched(true);
    if (!form.values.name.trim()) return;
    create.mutate({ input: toInput(form.values), key: idem.key }, { onSuccess: () => savedAndBack(), onError: idem.onError });
  }

  return (
    <Screen
      title={copy.addTitle}
      left={<TextLink title="Cancel" onPress={() => router.back()} />}
      titleGap={copy.titleGap}
      footer={<Button title={`Save ${copy.noun}`} onPress={save} loading={create.isPending} />}>
      <NameDescriptionForm form={form} error={create.error} copy={copy} />
      {copy.addNote ? <Notice text={copy.addNote} /> : null}
    </Screen>
  );
}

export function EditSimpleEntity({ crud, copy }: { crud: Crud; copy: Copy }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <EditLoader title={copy.editTitle} query={crud.useOne(id)}>
      {(item) => <EditForm crud={crud} copy={copy} item={item} />}
    </EditLoader>
  );
}

function EditForm({ crud, copy, item }: { crud: Crud; copy: Copy; item: ChickenType }) {
  const form = useFormValues({ name: item.name, description: item.description ?? '' });
  const update = crud.useUpdate(item.id);
  const setActive = crud.useSetActive(item.id);
  const idem = useIdempotencyKey();

  function save() {
    form.setTouched(true);
    if (!form.values.name.trim()) return;
    update.mutate({ input: toInput(form.values), key: idem.key }, { onSuccess: () => savedAndBack(), onError: idem.onError });
  }

  return (
    <Screen
      title={copy.editTitle}
      left={<TextLink title="Cancel" onPress={() => router.back()} />}
      titleGap={copy.titleGap}
      footer={<Button title="Save changes" onPress={save} loading={update.isPending} />}>
      <NameDescriptionForm form={form} error={update.error} copy={copy} />
      <ActiveSwitch active={item.active} mutation={setActive} onText={copy.activeOn} offText={copy.activeOff} />
    </Screen>
  );
}
