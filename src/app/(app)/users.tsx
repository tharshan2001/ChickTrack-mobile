import { router } from 'expo-router';

import { ComingSoon } from '@/components/coming-soon';
import { Screen } from '@/components/screen';
import { IconButton } from '@/components/ui';

export default function Users() {
  return (
    <Screen title="Users & roles" left={<IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />}>
      <ComingSoon icon="users" text="Only the owner signs in today. Multiple users and roles are coming next." />
    </Screen>
  );
}
