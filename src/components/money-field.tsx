import type { TextInputProps } from 'react-native';

import { Field } from '@/components/ui';
import { isDecimalDraft } from '@/lib/decimal';
import { type } from '@/theme/tokens';

type Props = Omit<TextInputProps, 'onChangeText' | 'value'> & {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  hint?: string;
  scale?: number;
};

/** Decimal input that keeps the value as a string and ignores characters that aren't a decimal. */
export function DecimalField({ value, onChangeText, scale = 2, ...rest }: Props) {
  return (
    <Field
      {...rest}
      value={value}
      inputMode="decimal"
      keyboardType="decimal-pad"
      onChangeText={(t) => {
        const cleaned = t.replace(',', '.');
        if (isDecimalDraft(cleaned, scale)) onChangeText(cleaned);
      }}
      style={type.inputMono}
    />
  );
}
