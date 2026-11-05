import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/auth-context';
import { FormError } from '@/components/form';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Button, Card, Field, IconButton, Notice, TextLink } from '@/components/ui';
import { useChangeOwnPassword } from '@/features/users-api';
import { colors, space } from '@/theme/tokens';

function strength(p: string) {
  if (p.length < 8) return { score: p ? 1 : 0, label: 'Too short · at least 8 characters', color: colors.danger };
  let score = 2;
  if (p.length >= 12) score += 1;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p)) score += 1;
  if (score >= 4) return { score, label: 'Strong', color: colors.success };
  if (score === 3) return { score, label: 'Good · at least 8 characters', color: colors.success };
  return { score, label: 'Fair · longer is safer', color: colors.warning };
}

export function PasswordScreen({ forced }: { forced?: boolean }) {
  const { user, signOut } = useAuth();
  const change = useChangeOwnPassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [touched, setTouched] = useState(false);
  const s = strength(next);
  const first = user?.fullName.split(/\s+/)[0] ?? '';
  const wrongCurrent =
    change.error instanceof ApiError && change.error.body.code === 'BUSINESS_RULE_VIOLATION' ? change.error.message : undefined;

  const errors = {
    current: !current ? 'Enter it' : wrongCurrent,
    next: next.length < 8 ? 'At least 8 characters' : next === current ? 'Choose a different password' : undefined,
    again: again !== next ? "The two passwords don't match" : undefined,
  };

  function save() {
    setTouched(true);
    if (!user || errors.current || errors.next || errors.again) return;
    change.mutate(
      { username: user.username, currentPassword: current, newPassword: next },
      { onSuccess: () => (forced ? undefined : router.back()) },
    );
  }

  return (
    <Screen
      title={forced ? 'Choose your password' : 'Change password'}
      titleGap={space.xs}
      left={forced ? undefined : <IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />}
      right={forced ? <TextLink title="Sign out" onPress={() => void signOut()} /> : undefined}
      footerShadow
      footer={<Button title={forced ? 'Save and continue' : 'Change password'} onPress={save} loading={change.isPending} />}
      headerExtra={
        forced ? (
          <View style={{ gap: space.sm, paddingTop: space.xs }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.tint,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Feather name="lock" size={22} color={colors.accentPressed} />
            </View>
            <Text variant="body" style={{ color: colors.secondary, lineHeight: 22 }}>
              {`Welcome${first ? `, ${first}` : ''}. You signed in with a temporary password from the owner. Pick your own to start using ChickTrack.`}
            </Text>
          </View>
        ) : undefined
      }>
      {wrongCurrent ? null : <FormError error={change.error} />}
      <Card style={{ padding: space.lg, gap: 14 }}>
        <Field
          label={forced ? 'Temporary password' : 'Current password'}
          value={current}
          onChangeText={setCurrent}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          error={touched ? errors.current : undefined}
        />
        <View style={{ gap: 6 }}>
          <Field
            label="New password"
            value={next}
            onChangeText={setNext}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            error={touched ? errors.next : undefined}
          />
          {next ? (
            <>
              <View style={{ flexDirection: 'row', gap: space.xs }}>
                {[1, 2, 3, 4].map((i) => (
                  <View
                    key={i}
                    style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= s.score ? s.color : colors.separator }}
                  />
                ))}
              </View>
              {touched && errors.next ? null : (
                <Text variant="caption" style={{ color: s.color }}>
                  {s.label}
                </Text>
              )}
            </>
          ) : null}
        </View>
        <Field
          label="Type it again"
          value={again}
          onChangeText={setAgain}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          error={touched ? errors.again : undefined}
        />
      </Card>
      {forced ? null : <Notice icon={false} text="Changing your password signs you out on your other phones." />}
    </Screen>
  );
}
