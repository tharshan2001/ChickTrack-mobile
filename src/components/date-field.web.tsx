import { Field } from '@/components/ui';

type Props = { label: string; value: string; onChange: (isoDate: string) => void; compact?: boolean };

/** Web fallback (development only): a yyyy-mm-dd text field. */
export function DateField({ label, value, onChange, compact }: Props) {
  return <Field label={label} value={value} onChangeText={onChange} placeholder="yyyy-mm-dd" maxLength={10} compact={compact} />;
}
