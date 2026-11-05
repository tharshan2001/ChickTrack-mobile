import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';

import { Text } from '@/components/text';
import { TextLink } from '@/components/ui';
import { formatIsoDate, toIsoDate } from '@/lib/format';
import { colors, radius, type } from '@/theme/tokens';

type Props = {
  label: string;
  /** yyyy-mm-dd */
  value: string;
  onChange: (isoDate: string) => void;
  /** 44px field used in compact forms. */
  compact?: boolean;
};

function toDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

/** Date picker: a field that opens the calendar, matching the mockup inputs. */
export function DateField({ label, value, onChange, compact }: Props) {
  const [open, setOpen] = useState(false);

  if (Platform.OS === 'android') {
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
            height: compact ? 44 : 48,
            borderRadius: radius.field,
            backgroundColor: colors.field,
            paddingHorizontal: compact ? 10 : 14,
            justifyContent: 'center',
          }}>
          <Text style={compact ? type.inputCompact : type.inputMedium}>{formatIsoDate(value)}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ gap: 6 }}>
      <Text variant="caption">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatIsoDate(value)}`}
        onPress={() => setOpen(true)}
        style={{
          height: compact ? 44 : 48,
          borderRadius: radius.field,
          backgroundColor: colors.field,
          paddingHorizontal: compact ? 10 : 14,
          justifyContent: 'center',
        }}>
        <Text style={compact ? type.inputCompact : type.inputMedium}>{formatIsoDate(value)}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.25)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: 16,
              gap: 8,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="title">{label}</Text>
              <TextLink title="Done" onPress={() => setOpen(false)} />
            </View>
            <DateTimePicker
              value={toDate(value)}
              mode="date"
              display="inline"
              accentColor={colors.accent}
              onValueChange={(_, d) => d && onChange(toIsoDate(d))}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
