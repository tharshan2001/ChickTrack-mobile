import Feather from '@expo/vector-icons/Feather';
import { Fragment, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { Separator, TextLink } from '@/components/ui';
import { colors, fonts, radius, space, type } from '@/theme/tokens';

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
  /** 44px control used in compact forms. */
  compact?: boolean;
};

/** Field that opens a sheet with a list of options (React Native has no <select>). */
export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Choose…',
  error,
  hideLabel,
  compact,
}: SelectProps) {
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
          height: compact ? 44 : 48,
          borderRadius: radius.field,
          backgroundColor: colors.field,
          paddingHorizontal: compact ? 10 : 14,
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 2,
          borderColor: error ? colors.danger : 'transparent',
          opacity: pressed ? 0.7 : 1,
        })}>
        <Text
          style={{
            flex: 1,
            ...(compact ? type.inputCompact : type.inputMedium),
            color: selected ? colors.ink : colors.secondary,
          }}
          numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <Feather name="chevron-down" size={compact ? 16 : 18} color={colors.secondary} />
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
  /** Lists put the segmented control directly under the title, without a label. */
  hideLabel?: boolean;
  /** 36px control used as a filter under a title. */
  compact?: boolean;
};

/** iOS-style segmented control used for small either/or choices. */
export function Segmented<T extends string>({ label, options, value, onChange, hideLabel, compact }: SegmentProps<T>) {
  return (
    <View style={{ gap: 6 }}>
      {hideLabel ? null : <Text variant="caption">{label}</Text>}
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
                height: compact ? 36 : 38,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: on ? colors.surface : 'transparent',
                boxShadow: on ? '0 1px 4px rgba(0, 0, 0, 0.12)' : undefined,
              }}>
              <Text
                numberOfLines={1}
                style={{ ...(on ? type.controlActive : type.control), color: colors.ink, paddingHorizontal: 4 }}>
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
                height: 40,
                paddingHorizontal: 14,
                borderRadius: radius.field,
                justifyContent: 'center',
                backgroundColor: on ? colors.tint : colors.field,
                boxShadow: on ? `inset 0 0 0 1.5px ${colors.accent}` : undefined,
              }}>
              <Text style={{ fontFamily: on ? fonts.bodyMedium : fonts.body, fontSize: 15, lineHeight: 20, color: on ? colors.accentPressed : colors.ink }}>
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

type MultiChipsProps<T extends string> = {
  label: string;
  options: { value: T; label: string }[];
  value: T[];
  onChange: (value: T[]) => void;
  hint?: string;
  error?: string;
};

export function MultiChips<T extends string>({ label, options, value, onChange, hint, error }: MultiChipsProps<T>) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant="caption">{label}</Text>
      <View accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <Pressable
              key={o.value}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
              style={{
                height: 40,
                paddingHorizontal: 14,
                borderRadius: radius.field,
                justifyContent: 'center',
                backgroundColor: on ? colors.tint : colors.field,
                boxShadow: on ? `inset 0 0 0 1.5px ${colors.accent}` : undefined,
              }}>
              <Text style={{ fontFamily: on ? fonts.bodyMedium : fonts.body, fontSize: 15, lineHeight: 20, color: on ? colors.accentPressed : colors.ink }}>
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
      ) : hint ? (
        <Text variant="caption">{hint}</Text>
      ) : null}
    </View>
  );
}
