import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { branches } from '@/api/resources';
import type { User } from '@/api/types';
import { EditLoader, FormError } from '@/components/form';
import { Chips, MultiChips } from '@/components/pickers';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Button, Card, Notice, TextLink } from '@/components/ui';
import { ASSIGNABLE_ROLES, ROLE_HELP, ROLE_LABEL } from '@/features/roles';
import { useSetAccess, useUser } from '@/features/users-api';
import { space } from '@/theme/tokens';
import { savedAndBack } from '@/components/motion';

export default function AccessRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditLoader title="Role & branches" query={useUser(id)}>{(u) => <Access u={u} />}</EditLoader>;
}

function Access({ u }: { u: User }) {
  const [role, setRole] = useState<string | null>(u.roles[0] ?? null);
  const [branchIds, setBranchIds] = useState<string[]>(u.branchIds);
  const branchList = branches.useList('', true);
  const save = useSetAccess(u.id);
  const first = u.fullName.split(/\s+/)[0];

  return (
    <Screen
      title="Role & branches"
      subtitle={u.fullName}
      titleGap={space.xs}
      left={<TextLink title="Cancel" onPress={() => router.back()} />}
      footerShadow
      footer={
        <Button
          title="Save"
          disabled={!role}
          loading={save.isPending}
          onPress={() =>
            role &&
            save.mutate(
              { roles: [role], branchIds: branchIds.filter((id) => branchList.data?.content.some((b) => b.id === id) ?? true) },
              { onSuccess: () => savedAndBack('Access saved') },
            )
          }
        />
      }>
      <FormError error={save.error} />
      <Card style={{ padding: space.lg, gap: space.md }}>
        <Chips label="Role" value={role} onChange={setRole} options={ASSIGNABLE_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r]! }))} />
        {role ? <Text variant="caption">{ROLE_HELP[role]}</Text> : null}
        <MultiChips
          label="Branches"
          value={branchIds}
          onChange={setBranchIds}
          options={(branchList.data?.content ?? []).map((b) => ({ value: b.id, label: b.name }))}
        />
      </Card>
      <Notice text={`Saving signs ${first} out, so the new access applies at their next sign-in.`} />
    </Screen>
  );
}
