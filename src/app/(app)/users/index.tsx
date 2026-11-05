import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { branches } from '@/api/resources';
import type { User } from '@/api/types';
import { useAuth } from '@/auth/auth-context';
import { EmptyState } from '@/components/empty-state';
import { AppearList, useFirstBatch } from '@/components/motion';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Badge, Card, ErrorBanner, IconButton, Notice, SearchField, Separator } from '@/components/ui';
import { isOwnerAccount, roleLabel } from '@/features/roles';
import { Avatar } from '@/features/user-ui';
import { useUsers } from '@/features/users-api';
import { colors, space } from '@/theme/tokens';

function rank(u: User) {
  if (isOwnerAccount(u.roles)) return 0;
  return u.active ? 1 : 2;
}

export default function UsersScreen() {
  const { user: me } = useAuth();
  const [search, setSearch] = useState('');
  const users = useUsers(search);
  const firstLoad = useFirstBatch(users.isSuccess);
  const branchList = branches.useList('');
  const branchName = (id: string) => branchList.data?.content.find((b) => b.id === id)?.name;
  const list = [...(users.data?.content ?? [])].sort((a, b) => rank(a) - rank(b) || a.fullName.localeCompare(b.fullName));
  const total = users.data?.totalElements;

  return (
    <Screen
      title="Users & roles"
      subtitle={total === undefined ? undefined : `${total} ${total === 1 ? 'person' : 'people'} · only you can add or change them`}
      left={<IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />}
      right={<IconButton icon="plus" label="Add user" filled onPress={() => router.push('/users/new')} />}
      headerExtra={
        <SearchField placeholder="Search name or username" value={search} onChangeText={setSearch} autoCapitalize="none" />
      }>
      {users.isError ? <ErrorBanner message={errorMessage(users.error)} onRetry={users.refetch} /> : null}
      {users.isPending ? <ActivityIndicator color={colors.accent} /> : null}
      {users.isSuccess && list.length === 0 ? (
        search ? (
          <EmptyState icon="search" title={`No one matches “${search}”`} text="Try a name or username." />
        ) : (
          <EmptyState icon="users" tone="brand" title="No users yet" text="Add the people who work at head office and the branches." />
        )
      ) : null}
      {list.length ? (
        <Card>
          <AppearList still={firstLoad}>
            {list.map((u, i) => {
            const mine = u.id === me?.id;
            const owner = isOwnerAccount(u.roles);
            const where = owner
              ? 'every branch'
              : u.branchIds
                  .map(branchName)
                  .filter(Boolean)
                  .join(', ');
            return (
              <Fragment key={u.id}>
                {i > 0 ? <Separator inset={68} /> : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/users/[id]', params: { id: u.id } })}
                  style={({ pressed }) => ({
                    minHeight: 68,
                    paddingHorizontal: space.lg,
                    paddingVertical: space.sm,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.md,
                    backgroundColor: pressed ? colors.field : 'transparent',
                  })}>
                  <Avatar name={u.fullName} me={mine} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyMedium" numberOfLines={1} style={!u.active ? { color: colors.secondary } : undefined}>
                      {u.fullName}
                    </Text>
                    <Text variant="caption" numberOfLines={1}>
                      <Text variant="monoSmall" style={{ color: colors.secondary }}>
                        {u.username}
                      </Text>
                      {` · ${roleLabel(u.roles)}${where ? ` · ${where}` : ''}`}
                    </Text>
                  </View>
                  {mine ? (
                    <Badge label="You" tone="brand" />
                  ) : !u.active ? (
                    <Badge label="Inactive" tone="danger" />
                  ) : u.mustChangePassword ? (
                    <Badge label="New login" tone="warning" />
                  ) : (
                    <Badge label="Active" tone="success" />
                  )}
                </Pressable>
              </Fragment>
            );
          })}
          </AppearList>
        </Card>
      ) : null}
      <Notice
        icon={false}
        text={'"New login" means they haven\'t chosen their own password yet. They can only set a password until they do.'}
      />
    </Screen>
  );
}
