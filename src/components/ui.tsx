import Feather from '@expo/vector-icons/Feather';
import { useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewProps,
} from 'react-native';

import { ChevronLeftIcon, ChevronRightIcon, InfoIcon, PlusIcon } from '@/components/icons';
import { MAX_FONT_SCALE, Text, androidText } from '@/components/text';
import { cardShadow, colors, radius, space, type } from '@/theme/tokens';

export function Card({ style, ...rest }: ViewProps) {
  return <View {...rest} style={[styles.card, style]} />;
}

export function Separator({ inset = space.lg }: { inset?: number }) {
  return <View style={[styles.separator, { marginLeft: inset }]} />;
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
};

export function Button({ title, onPress, variant = 'primary', loading, disabled }: ButtonProps) {
  const primary = variant === 'primary';
  const danger = variant === 'danger';
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : danger ? styles.buttonDanger : styles.buttonSecondary,
        danger && { height: 48 },
        pressed && primary && { backgroundColor: colors.accentPressed },
        pressed && !primary && { opacity: 0.7 },
        inactive && { opacity: 0.5 },
      ]}>
      {loading ? (
        <ActivityIndicator color={primary ? colors.surface : danger ? colors.danger : colors.accent} />
      ) : (
        <Text
          variant="bodyMedium"
          numberOfLines={1}
          style={{ color: primary ? colors.surface : danger ? colors.danger : colors.ink, letterSpacing: 0.5 }}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

type Tone = 'success' | 'neutral' | 'warning' | 'brand' | 'danger';

const badgeTones: Record<Tone, { bg: string; fg: string; border: string }> = {
  success: { bg: colors.successBg, fg: colors.success, border: colors.successBorder },
  neutral: { bg: colors.field, fg: colors.secondary, border: colors.separator },
  warning: { bg: colors.warningBg, fg: colors.warning, border: colors.warningBorder },
  brand: { bg: colors.tint, fg: colors.accentPressed, border: colors.tintBorder },
  danger: { bg: colors.dangerBg, fg: colors.danger, border: colors.dangerBorder },
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

type FieldProps = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
  /** 44px fields used in two-column grids. */
  compact?: boolean;
  /** 52px monospace field for headline weights. */
  large?: boolean;
  /** 50px monospace field for daily sales weights. */
  mid?: boolean;
  /** 56px monospace field for the biggest weights (delivery receipts). */
  huge?: boolean;
  /** Monospace text, for codes and references. */
  mono?: boolean;
  /** Hide the visible label but keep it as the accessibility label. */
  hideLabel?: boolean;
  password?: boolean;
  ref?: Ref<ComponentRef<typeof TextInput>>;
};

export function Field({
  label,
  hint,
  error,
  style,
  multiline,
  compact,
  large,
  mid,
  huge,
  mono,
  hideLabel,
  password,
  onFocus,
  onBlur,
  ...rest
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {hideLabel ? null : <Text variant="caption">{label}</Text>}
      <View>
        <TextInput
          {...rest}
          {...(password ? { secureTextEntry: !shown, autoCapitalize: 'none', autoCorrect: false } : null)}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          multiline={multiline}
          placeholderTextColor={colors.secondary}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            compact && styles.inputCompact,
            large && styles.inputLarge,
            mid && styles.inputMid,
            huge && styles.inputHuge,
            mono &&
              (compact
                ? type.inputMonoSmall
                : large
                  ? type.inputMonoLarge
                  : mid
                    ? type.inputMonoMid
                    : huge
                      ? type.inputMonoHuge
                      : type.inputMono),
            multiline && styles.inputMultiline,
            focused && !error && { borderColor: colors.accent },
            !!error && { borderColor: colors.danger },
            password && { paddingRight: 48 },
            style,
          ]}
        />
        {password ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={shown ? 'Hide password' : 'Show password'}
            onPress={() => setShown((v) => !v)}
            hitSlop={4}
            style={({ pressed }) => [styles.eye, pressed && { opacity: 0.6 }]}>
            <Feather name={shown ? 'eye-off' : 'eye'} size={20} color={colors.secondary} />
          </Pressable>
        ) : null}
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

export function SearchField({ style, ...props }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.secondary}
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      autoCorrect={false}
      clearButtonMode="while-editing"
      {...props}
      style={[styles.search, style]}
    />
  );
}

type RowProps = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  muted?: boolean;
  chevron?: boolean;
  /** 52px row used by the More menu. */
  compact?: boolean;
};

export function ListRow({ title, subtitle, right, onPress, muted, chevron, compact }: RowProps) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.row, compact && styles.rowCompact, pressed && { backgroundColor: colors.field }]}>
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
      {right || chevron ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          {right}
          {chevron ? <ChevronRightIcon size={16} /> : null}
        </View>
      ) : null}
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
      {icon === 'chevron-left' ? (
        <ChevronLeftIcon />
      ) : icon === 'plus' ? (
        <PlusIcon />
      ) : (
        <Feather name={icon} size={24} color={colors.accent} />
      )}
    </Pressable>
  );
}

export function TextLink({
  title,
  onPress,
  pill,
}: {
  title: string;
  onPress: () => void;
  /** Filled accent button, as Money's "+ Payment" link. */
  pill?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        { height: 44, justifyContent: 'center', paddingHorizontal: space.sm },
        pill && {
          height: 40,
          borderRadius: radius.field,
          paddingHorizontal: 14,
          backgroundColor: pressed ? colors.accentPressed : colors.accent,
        },
      ]}>
      <Text
        variant="bodyMedium"
        style={{ color: pill ? colors.surface : colors.accent, letterSpacing: pill ? 0.5 : undefined }}>
        {title}
      </Text>
    </Pressable>
  );
}

export function Notice({ text, icon = true }: { text: string; icon?: boolean }) {
  if (!icon) {
    return (
      <Text variant="caption" style={{ paddingHorizontal: space.xs, lineHeight: 19 }}>
        {text}
      </Text>
    );
  }
  return (
    <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: space.xs }}>
      <InfoIcon />
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

/**
 * A section landmark, as in the mockups: 22px Space Grotesk, the middle level
 * between the 28px page title and the 16px rows. Small grey capitals here left
 * the screen with no landmark at all between title and content.
 */
export function SectionHeader({ title, size = 'large' }: { title: string; size?: 'large' | 'small' }) {
  return (
    <Text variant={size === 'small' ? 'labelSmall' : 'title'} style={size === 'small' ? { marginHorizontal: space.xs } : undefined}>
      {title}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.card, ...cardShadow },
  separator: { height: 1, backgroundColor: colors.separator },
  button: { height: 50, borderRadius: radius.field, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonSecondary: { backgroundColor: colors.field },
  buttonDanger: { backgroundColor: 'transparent' },
  badge: {
    flexShrink: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  inputCompact: { height: 44, minHeight: 44, paddingHorizontal: 10, ...type.inputCompact },
  inputLarge: { minHeight: 52, paddingHorizontal: 14 },
  inputMid: { minHeight: 50, paddingHorizontal: 14 },
  inputHuge: { minHeight: 56, paddingHorizontal: 14 },
  inputMultiline: { minHeight: 72, paddingTop: 12, paddingBottom: 12, textAlignVertical: 'top', ...type.textarea },
  search: {
    height: 40,
    borderRadius: radius.field,
    backgroundColor: colors.field,
    paddingHorizontal: 14,
    ...type.search,
    ...androidText,
    color: colors.ink,
    paddingVertical: 0,
  },
  row: { minHeight: 64, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowCompact: { minHeight: 52 },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  eye: { position: 'absolute', right: 2, top: 0, bottom: 0, width: 44, alignItems: 'center', justifyContent: 'center' },
});
