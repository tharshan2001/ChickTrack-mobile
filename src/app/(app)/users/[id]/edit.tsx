import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import type { User } from '@/api/types';
import { EditLoader, FormError, fieldErrors, optional, useFormValues, useIdempotencyKey } from '@/components/form';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Button, Card, Field, TextLink } from '@/components/ui';
import { useUpdateUser, useUser } from '@/features/users-api';
import { colors, radius, space } from '@/theme/tokens';
import { savedAndBack } from '@/components/motion';

export default function EditUserRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditLoader title="Edit user" query={useUser(id)}>{(u) => <EditUser u={u} />}</EditLoader>;
}

function EditUser({ u }: { u: User }) {
  const form = useFormValues({ fullName: u.fullName, email: u.email ?? '', phone: u.phone ?? '' });
  const update = useUpdateUser(u.id);
  const idem = useIdempotencyKey();
  const server = fieldErrors(update.error);
  const v = form.values;
  const nameError = !v.fullName.trim() ? 'Enter their name' : server.fullName;

  function save() {
    form.setTouched(true);
    if (!v.fullName.trim()) return;
    update.mutate(
      { key: idem.key, input: { fullName: v.fullName.trim(), email: optional(v.email), phone: optional(v.phone) } },
      { onError: idem.onError, onSuccess: () => savedAndBack('User saved') },
    );
  }

  return (
    <Screen
      title={`Edit ${u.fullName.split(/\s+/)[0]}`}
      titleGap={space.xs}
      left={<TextLink title="Cancel" onPress={() => router.back()} />}
      footerShadow
      footer={<Button title="Save changes" onPress={save} loading={update.isPending} />}>
      <FormError error={update.error} />
      <Card style={{ padding: space.lg, gap: 14 }}>
        <Field label="Full name" value={v.fullName} onChangeText={form.set('fullName')} error={form.touched ? nameError : undefined} />
        <View style={{ gap: 6 }}>
          <Text variant="caption">Username</Text>
          <View
            style={{
              minHeight: 48,
              borderRadius: radius.field,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: colors.separator,
              justifyContent: 'center',
            }}>
            <Text variant="mono">{u.username}</Text>
          </View>
          <Text variant="caption">Usernames can&apos;t be changed.</Text>
        </View>
        <Field
          label="Email (optional)"
          value={v.email}
          onChangeText={form.set('email')}
          error={server.email}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field label="Phone (optional)" value={v.phone} onChangeText={form.set('phone')} error={server.phone} keyboardType="phone-pad" />
      </Card>
      <Text variant="caption" style={{ paddingHorizontal: space.xs, lineHeight: 19 }}>
        Role and branches are changed from their own rows on this person&apos;s page.
      </Text>
    </Screen>
  );
}
