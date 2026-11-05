import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { branches } from '@/api/resources';
import { FormError, fieldErrors, optional, useFormValues, useIdempotencyKey } from '@/components/form';
import { Chips, MultiChips, Segmented } from '@/components/pickers';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Button, Card, Field, TextLink } from '@/components/ui';
import { credentialsStore } from '@/features/credentials-store';
import { ASSIGNABLE_ROLES, ROLE_HELP, ROLE_LABEL } from '@/features/roles';
import { useCreateUser } from '@/features/users-api';
import { space } from '@/theme/tokens';

const USERNAME = /^[A-Za-z0-9._-]{3,100}$/;

export default function AddUser() {
  const form = useFormValues({ fullName: '', username: '', phone: '', email: '', password: '' });
  const [role, setRole] = useState<string | null>(null);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [mode, setMode] = useState<'generate' | 'type'>('generate');
  const branchList = branches.useList('', true);
  const create = useCreateUser();
  const idem = useIdempotencyKey();
  const v = form.values;
  const server = fieldErrors(create.error);

  const errors = {
    fullName: !v.fullName.trim() ? 'Enter their name' : server.fullName,
    username: !USERNAME.test(v.username.trim())
      ? 'At least 3 letters, digits, dots, dashes or underscores'
      : server.username,
    role: !role ? 'Choose a role' : server.roles,
    password: mode === 'type' && v.password.length < 8 ? 'At least 8 characters' : server.password,
    email: server.email,
    phone: server.phone,
  };
  const show = (e: string | undefined) => (form.touched ? e : undefined);

  function save() {
    form.setTouched(true);
    if (errors.fullName || errors.username || errors.role || errors.password) return;
    create.mutate(
      {
        key: idem.key,
        input: {
          fullName: v.fullName.trim(),
          username: v.username.trim(),
          phone: optional(v.phone),
          email: optional(v.email),
          password: mode === 'type' ? v.password : null,
          roles: [role!],
          branchIds,
          mustChangePassword: true,
        },
      },
      {
        onError: idem.onError,
        onSuccess: (user) => {
          credentialsStore.set({
            fullName: user.fullName,
            username: user.username,
            password: user.temporaryPassword ?? v.password,
            generated: !!user.temporaryPassword,
            reset: false,
          });
          router.replace('/users/credentials');
        },
      },
    );
  }

  return (
    <Screen
      title="Add user"
      titleGap={space.xs}
      bodyGap={14}
      left={<TextLink title="Cancel" onPress={() => router.back()} />}
      footerShadow
      footer={<Button title="Create user" onPress={save} loading={create.isPending} />}>
      <FormError error={create.error} />
      <Card style={{ padding: space.lg, gap: space.md }}>
        <Field label="Full name" value={v.fullName} onChangeText={form.set('fullName')} error={show(errors.fullName)} autoFocus />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Username"
              value={v.username}
              onChangeText={form.set('username')}
              error={show(errors.username)}
              autoCapitalize="none"
              autoCorrect={false}
              mono
              compact
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Phone (optional)"
              value={v.phone}
              onChangeText={form.set('phone')}
              error={show(errors.phone)}
              keyboardType="phone-pad"
              compact
            />
          </View>
        </View>
        <Field
          label="Email (optional)"
          value={v.email}
          onChangeText={form.set('email')}
          error={show(errors.email)}
          placeholder="name@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </Card>

      <Card style={{ padding: space.lg, gap: space.md }}>
        <Chips
          label="Role"
          value={role}
          onChange={setRole}
          error={show(errors.role)}
          options={ASSIGNABLE_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r]! }))}
        />
        {role ? <Text variant="caption">{ROLE_HELP[role]}</Text> : null}
        <MultiChips
          label="Branches"
          value={branchIds}
          onChange={setBranchIds}
          hint={branchIds.length ? undefined : 'None chosen: head-office roles see every branch; branch roles see none.'}
          options={(branchList.data?.content ?? []).map((b) => ({ value: b.id, label: b.name }))}
        />
      </Card>

      <Card style={{ padding: space.lg, gap: space.md }}>
        <Segmented
          label="Password"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'generate', label: 'Generate one' },
            { value: 'type', label: 'Type one' },
          ]}
        />
        {mode === 'type' ? (
          <Field
            label="Temporary password"
            value={v.password}
            onChangeText={form.set('password')}
            error={show(errors.password)}
            secureTextEntry
            autoCapitalize="none"
          />
        ) : null}
        <Text variant="caption" style={{ lineHeight: 19 }}>
          You&apos;ll see it once, to pass on. They choose their own the first time they sign in.
        </Text>
      </Card>
    </Screen>
  );
}
