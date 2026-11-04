import { useState } from 'react';

import { ApiError, errorMessage } from '@/api/client';
import type { ChickenTypeInput } from '@/api/types';
import { Card, ErrorBanner, Field } from '@/components/ui';
import { space } from '@/theme/tokens';

export const NAME_MAX = 100;
export const DESCRIPTION_MAX = 255;

export type ProductFormState = { name: string; description: string };

/** Form state plus validation that mirrors ChickenTypeCreateRequest / UpdateRequest. */
export function useProductForm(initial: ProductFormState = { name: '', description: '' }) {
  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState(false);

  const nameError = !values.name.trim() ? 'Enter a name' : undefined;
  const valid = !nameError;

  const toInput = (): ChickenTypeInput => ({
    name: values.name.trim(),
    description: values.description.trim() || null,
  });

  return { values, setValues, touched, setTouched, nameError, valid, toInput };
}

type Props = {
  form: ReturnType<typeof useProductForm>;
  error: unknown;
};

export function ProductForm({ form, error }: Props) {
  const { values, setValues, touched, nameError } = form;
  const fieldErrors = error instanceof ApiError ? error.fieldErrors : {};
  // Field errors are shown inline; anything else (e.g. duplicate name, 409) in a banner.
  const bannerError = error && !(error instanceof ApiError && Object.keys(fieldErrors).length) ? errorMessage(error) : null;

  return (
    <>
      {bannerError ? <ErrorBanner message={bannerError} /> : null}
      <Card style={{ padding: space.lg, gap: space.lg }}>
        <Field
          label="Name"
          value={values.name}
          onChangeText={(name) => setValues((v) => ({ ...v, name }))}
          maxLength={NAME_MAX}
          autoCapitalize="words"
          autoFocus
          returnKeyType="next"
          hint="Must be unique. Shown on purchases, stock and reports."
          error={fieldErrors.name ?? (touched ? nameError : undefined)}
        />
        <Field
          label="Description (optional)"
          value={values.description}
          onChangeText={(description) => setValues((v) => ({ ...v, description }))}
          maxLength={DESCRIPTION_MAX}
          multiline
          error={fieldErrors.description}
        />
      </Card>
    </>
  );
}
