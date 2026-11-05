import { router } from 'expo-router';

import { ComingSoon } from '@/components/coming-soon';
import { Screen } from '@/components/screen';
import { IconButton } from '@/components/ui';

export default function ChangePassword() {
  return (
    <Screen title="Change password" left={<IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />}>
      <ComingSoon icon="lock" text="Password changes are handled by your server administrator for now." />
    </Screen>
  );
}
