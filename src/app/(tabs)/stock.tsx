import { ComingSoon } from '@/components/coming-soon';
import { Screen } from '@/components/screen';

export default function StockTab() {
  return (
    <Screen title="Stock">
      <ComingSoon icon="layers" text="Stock batches, purchases and adjustments are next." />
    </Screen>
  );
}
