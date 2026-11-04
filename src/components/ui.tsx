import Feather from '@expo/vector-icons/Feather';
import type { ComponentRef, ReactNode, Ref } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewProps,
} from 'react-native';

import { MAX_FONT_SCALE, Text, androidText } from '@/components/text';
import { cardShadow, colors, radius, space, type } from '@/theme/tokens';

export function Card({ style, ...rest }: ViewProps) {
  return <View {...rest} style={[styles.card, style]} />;
}

export function Separator() {
  return <View style={styles.separator} />;
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
};

export function Button({ title, onPress, variant = 'primary', loading, disabled }: ButtonProps) {
  const primary = variant === 'primary';
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonSecondary,
        pressed && primary && { backgroundColor: colors.accentPressed },
        pressed && !primary && { opacity: 0.7 },
        inactive && { opacity: 0.5 },
      ]}>
      {loading ? (
        <ActivityIndicator color={primary ? colors.surface : colors.accent} />
      ) : (
        <Text variant="bodyMedium" numberOfLines={1} style={{ color: primary ? colors.surface : colors.accent, letterSpacing: 0.5 }}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

type Tone = 'success' | 'neutral' | 'warning' | 'brand';

const badgeTones: Record<Tone, { bg: string; fg: string; border: string }> = {
  success: { bg: colors.successBg, fg: colors.success, border: colors.successBorder },
  neutral: { bg: colors.field, fg: colors.secondary, border: colors.separator },
  warning: { bg: colors.warningBg, fg: colors.warning, border: colors.warningBorder },
  brand: { bg: colors.tint, fg: colors.accentPressed, border: colors.tintBorder },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const t = badgeTones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Text variant="badge" numberOfLines={1} style={{ color: t.fg }}>
        {label}
      </Text>
    </View>
  );
}

type FieldProps = TextInputProps & { label: string; hint?: string; error?: string; ref?: Ref<ComponentRef<typeof TextInput>> };

export function Field({ label, hint, error, style, multiline, ...rest }: FieldProps) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant="caption">{label}</Text>
      <TextInput
        {...rest}
        accessibilityLabel={rest.accessibilityLabel ?? label}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        multiline={multiline}
        placeholderTextColor={colors.secondary}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          !!error && { borderColor: colors.danger },
          style,
        ]}
      />
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

export function SearchField(props: TextInputProps) {
  return (
    <View style={styles.search}>
      <Feather name="search" size={16} color={colors.secondary} />
      <TextInput
        placeholderTextColor={colors.secondary}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        autoCorrect={false}
        clearButtonMode="while-editing"
        {...props}
        style={styles.searchInput}
      />
    </View>
  );
}

type RowProps = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  muted?: boolean;
  chevron?: boolean;
};

export function ListRow({ title, subtitle, right, onPress, muted, chevron }: RowProps) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.field }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyMedium" style={muted && { color: colors.secondary }} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {chevron ? <Feather name="chevron-right" size={16} color={colors.secondary} /> : null}
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  filled,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  filled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconButton,
        filled && { backgroundColor: pressed ? colors.accentPressed : colors.accent },
        !filled && pressed && { opacity: 0.6 },
      ]}>
      <Feather name={icon} size={filled ? 20 : 24} color={filled ? colors.surface : colors.accent} />
    </Pressable>
  );
}

export function TextLink({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={{ height: 44, justifyContent: 'center' }}>
      {({ pressed }) => (
        <Text variant="bodyMedium" style={{ color: pressed ? colors.accentPressed : colors.accent }}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Notice({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: space.xs }}>
      <Feather name="info" size={18} color={colors.secondary} style={{ marginTop: 1 }} />
      <Text variant="caption" style={{ flex: 1, lineHeight: 19 }}>
        {text}
      </Text>
    </View>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card style={{ padding: space.lg, gap: space.sm }}>
      <Text variant="bodyMedium" style={{ color: colors.danger }}>
        {message}
      </Text>
      {onRetry ? <TextLink title="Try again" onPress={onRetry} /> : null}
    </Card>
  );
}

export function SectionHeader({ title }: { title: string }) {
  return (
    <Text variant="label" style={{ marginHorizontal: space.xs }}>
      {title}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.card, ...cardShadow },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: space.lg },
  button: { height: 50, borderRadius: radius.field, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonSecondary: { backgroundColor: colors.field },
  badge: {
    flexShrink: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  input: {
    minHeight: 48,
    borderRadius: radius.field,
    paddingHorizontal: 14,
    backgroundColor: colors.field,
    borderWidth: 2,
    borderColor: 'transparent',
    ...type.input,
    ...androidText,
    color: colors.ink,
  },
  inputMultiline: { minHeight: 72, paddingTop: 12, paddingBottom: 12, textAlignVertical: 'top' },
  search: {
    height: 40,
    borderRadius: radius.field,
    backgroundColor: colors.field,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
  },
  searchInput: { flex: 1, ...type.input, ...androidText, color: colors.ink, paddingVertical: 0 },
  row: { minHeight: 64, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
