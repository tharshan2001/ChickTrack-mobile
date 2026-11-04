import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, View } from 'react-native';

import { Text } from '@/components/text';
import { formatIsoDate, toIsoDate } from '@/lib/format';
import { colors, radius } from '@/theme/tokens';

type Props = {
  label: string;
  /** yyyy-mm-dd */
  value: string;
  onChange: (isoDate: string) => void;
};

function toDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

/** Date picker: compact inline picker on iOS, the system dialog on Android. */
export function DateField({ label, value, onChange }: Props) {
  if (Platform.OS === 'ios') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="caption">{label}</Text>
        <DateTimePicker
          value={toDate(value)}
          mode="date"
          display="compact"
          accentColor={colors.accent}
          onValueChange={(_, d) => onChange(toIsoDate(d))}
        />
      </View>
    );
  }
  return (
    <View style={{ gap: 6 }}>
      <Text variant="caption">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatIsoDate(value)}`}
        onPress={() =>
          DateTimePickerAndroid.open({
            value: toDate(value),
            mode: 'date',
            onValueChange: (_, d) => onChange(toIsoDate(d)),
          })
        }
        style={{
          height: 48,
          borderRadius: radius.field,
          backgroundColor: colors.field,
          paddingHorizontal: 14,
          justifyContent: 'center',
        }}>
        <Text variant="bodyMedium" style={{ fontSize: 16 }}>
          {formatIsoDate(value)}
        </Text>
      </Pressable>
    </View>
  );
}
