import { ComingSoon } from '@/components/coming-soon';
import { Screen } from '@/components/screen';

export default function MoneyTab() {
  return (
    <Screen title="Money">
      <ComingSoon icon="credit-card" text="Branch balances and payments are next." />
    </Screen>
  );
}
