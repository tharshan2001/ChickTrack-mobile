import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, Switch, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { branches } from '@/api/resources';
import type { User } from '@/api/types';
import { useAuth } from '@/auth/auth-context';
import { EditLoader } from '@/components/form';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Card, ErrorBanner, IconButton, ListRow, Notice, SectionHeader, Separator, TextLink } from '@/components/ui';
import { credentialsStore } from '@/features/credentials-store';
import { isOwnerAccount, roleLabel } from '@/features/roles';
import { Avatar } from '@/features/user-ui';
import { useResetPassword, useSetUserActive, useUser } from '@/features/users-api';
import { colors, space } from '@/theme/tokens';

export default function UserRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditLoader title="User" query={useUser(id)}>{(u) => <UserView u={u} />}</EditLoader>;
}

function Line({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={{ minHeight: 56, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <Text style={{ flex: 1 }}>{label}</Text>
      <Text variant={mono ? 'monoSmall' : 'body'} style={{ color: colors.secondary }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function UserView({ u }: { u: User }) {
  const { user: me } = useAuth();
  const branchList = branches.useList('');
  const reset = useResetPassword(u.id);
  const setActive = useSetUserActive(u.id);
  const owner = isOwnerAccount(u.roles);
  const first = u.fullName.split(/\s+/)[0];
  const branchNames = u.branchIds
    .map((id) => branchList.data?.content.find((b) => b.id === id)?.name)
    .filter(Boolean)
    .join(', ');
  const shownActive = setActive.isPending ? !u.active : u.active;

  function confirmReset() {
    Alert.alert(`Reset ${first}'s password?`, `${first} is signed out on every phone and gets a new temporary password.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () =>
          reset.mutate(undefined, {
            onSuccess: (r) => {
              if (!r.temporaryPassword) return;
              credentialsStore.set({ fullName: r.fullName, username: r.username, password: r.temporaryPassword, generated: true, reset: true });
              router.push('/users/credentials');
            },
          }),
      },
    ]);
  }

  return (
    <Screen
      title={u.fullName}
      subtitle={
        <Text variant="monoSmall" style={{ color: colors.secondary }}>
          {u.username}
        </Text>
      }
      left={<IconButton icon="chevron-left" label="Back to users" onPress={() => router.back()} />}
      right={<TextLink title="Edit" onPress={() => router.push({ pathname: '/users/[id]/edit', params: { id: u.id } })} />}
      bodyGap={20}
      headerExtra={<Avatar name={u.fullName} me={u.id === me?.id} size={56} />}>
      {reset.isError ? <ErrorBanner message={errorMessage(reset.error)} /> : null}
      {setActive.isError ? <ErrorBanner message={errorMessage(setActive.error)} /> : null}

      <Card>
        {owner ? (
          <Line label="Role" value="Owner" />
        ) : (
          <ListRow
            title="Role"
            right={<Text style={{ color: colors.secondary }}>{roleLabel(u.roles)}</Text>}
            chevron
            compact
            onPress={() => router.push({ pathname: '/users/[id]/access', params: { id: u.id } })}
          />
        )}
        <Separator />
        {owner ? (
          <Line label="Branches" value="Every branch" />
        ) : (
          <ListRow
            title="Branches"
            right={
              <Text style={{ color: colors.secondary }} numberOfLines={1}>
                {branchNames || 'None'}
              </Text>
            }
            chevron
            compact
            onPress={() => router.push({ pathname: '/users/[id]/access', params: { id: u.id } })}
          />
        )}
        {u.phone ? (
          <>
            <Separator />
            <Line label="Phone" value={u.phone} mono />
          </>
        ) : null}
        {u.email ? (
          <>
            <Separator />
            <Line label="Email" value={u.email} />
          </>
        ) : null}
      </Card>

      {owner ? (
        <Notice text="The owner is the main admin. Change your password from More → Change password." />
      ) : (
        <View style={{ gap: space.sm }}>
          <SectionHeader title="Sign-in" />
          <Card>
            <Pressable
              accessibilityRole="button"
              disabled={reset.isPending}
              onPress={confirmReset}
              style={({ pressed }) => ({
                minHeight: 64,
                paddingHorizontal: space.lg,
                justifyContent: 'center',
                gap: 2,
                backgroundColor: pressed ? colors.field : 'transparent',
                opacity: reset.isPending ? 0.5 : 1,
              })}>
              <Text variant="bodyMedium" style={{ color: colors.accent }}>
                {reset.isPending ? 'Resetting…' : 'Reset password'}
              </Text>
              <Text variant="caption">Signs {first} out and gives a new temporary password</Text>
            </Pressable>
            <Separator />
            <View style={{ minHeight: 64, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyMedium">Can sign in</Text>
                <Text variant="caption">{shownActive ? 'Turn off when someone leaves' : `${first} can't sign in`}</Text>
              </View>
              <Switch
                accessibilityLabel="Can sign in"
                value={shownActive}
                disabled={setActive.isPending}
                onValueChange={(v) => setActive.mutate(v)}
                trackColor={{ true: colors.success, false: colors.separator }}
                thumbColor={colors.surface}
              />
            </View>
          </Card>
          <Notice
            icon={false}
            text={`Changing the role or turning sign-in off takes effect on ${first}'s phone within 15 minutes.`}
          />
        </View>
      )}
    </Screen>
  );
}
