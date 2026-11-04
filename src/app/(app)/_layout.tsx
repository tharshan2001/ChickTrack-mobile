import { Stack } from 'expo-router';

import { colors } from '@/theme/tokens';

/** Everything behind sign-in. "new" screens open as sheets. */
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
      <Stack.Screen name="(tabs)" />
      {['products', 'suppliers', 'expense-categories', 'branches'].map((r) => (
        <Stack.Screen key={r} name={`${r}/new`} options={{ presentation: 'modal' }} />
      ))}
      <Stack.Screen name="purchases/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="prices/set" options={{ presentation: 'modal' }} />
      <Stack.Screen name="prices/margin" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
