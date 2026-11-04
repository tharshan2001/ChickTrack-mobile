import Feather from '@expo/vector-icons/Feather';
import { Fragment, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { Separator, TextLink } from '@/components/ui';
import { colors, fonts, radius, space } from '@/theme/tokens';

export type Option = { value: string; label: string; detail?: string };

type SelectProps = {
  label: string;
  value: string | null;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  /** Hide the visible label (e.g. when a segmented control above already says it). */
  hideLabel?: boolean;
};

/** Field that opens a sheet with a list of options (React Native has no <select>). */
export function SelectField({ label, value, options, onChange, placeholder = 'Choose…', error, hideLabel }: SelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={{ gap: 6 }}>
      {hideLabel ? null : <Text variant="caption">{label}</Text>}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? 'not chosen'}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          height: 48,
          borderRadius: radius.field,
          backgroundColor: colors.field,
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 2,
          borderColor: error ? colors.danger : 'transparent',
          opacity: pressed ? 0.7 : 1,
        })}>
        <Text
          variant="bodyMedium"
          style={{ flex: 1, fontSize: 16, color: selected ? colors.ink : colors.secondary }}
          numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <Feather name="chevron-down" size={18} color={colors.secondary} />
      </Pressable>
      {error ? (
        <Text variant="caption" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
          <View
            style={{
              paddingHorizontal: space.lg,
              paddingVertical: space.sm,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <Text variant="title">{label}</Text>
            <TextLink title="Close" onPress={() => setOpen(false)} />
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }}>
            {options.length === 0 ? (
              <Text variant="caption" style={{ padding: space.lg }}>
                Nothing to choose yet.
              </Text>
            ) : null}
            {options.map((o, i) => (
              <Fragment key={o.value}>
                {i > 0 ? <Separator /> : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: o.value === value }}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => ({
                    minHeight: 56,
                    paddingHorizontal: space.lg,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                    backgroundColor: pressed ? colors.field : colors.surface,
                  })}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyMedium">{o.label}</Text>
                    {o.detail ? <Text variant="caption">{o.detail}</Text> : null}
                  </View>
                  {o.value === value ? <Feather name="check" size={20} color={colors.accent} /> : null}
                </Pressable>
              </Fragment>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

type SegmentProps<T extends string> = {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** iOS-style segmented control used for small either/or choices. */
export function Segmented<T extends string>({ label, options, value, onChange }: SegmentProps<T>) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant="caption">{label}</Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={{ flexDirection: 'row', backgroundColor: colors.field, borderRadius: radius.field, padding: 3 }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(o.value)}
              style={{
                flex: 1,
                height: 38,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: on ? colors.surface : 'transparent',
                boxShadow: on ? '0 1px 4px rgba(0, 0, 0, 0.12)' : undefined,
              }}>
              <Text
                numberOfLines={1}
                style={{ fontFamily: on ? fonts.bodySemiBold : fonts.body, fontSize: 13, color: colors.ink, paddingHorizontal: 4 }}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Wrapping pill buttons for picking one of several reasons. */
type ChipsProps<T extends string> = {
  label: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
};

export function Chips<T extends string>({ label, options, value, onChange, error }: ChipsProps<T>) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant="caption">{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(o.value)}
              style={{
                height: 36,
                paddingHorizontal: 14,
                borderRadius: 18,
                justifyContent: 'center',
                backgroundColor: on ? colors.ink : colors.field,
              }}>
              <Text style={{ fontFamily: on ? fonts.bodySemiBold : fonts.body, fontSize: 13, color: on ? colors.surface : colors.ink }}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text variant="caption" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
