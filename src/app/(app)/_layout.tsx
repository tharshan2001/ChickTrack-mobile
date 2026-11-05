import { Stack } from 'expo-router';

import { useAuth } from '@/auth/auth-context';
import { PasswordScreen } from '@/features/password-screen';
import { colors } from '@/theme/tokens';

/** Everything behind sign-in. "new" screens open as sheets. */
export default function AppLayout() {
  const { user } = useAuth();
  if (user?.mustChangePassword) return <PasswordScreen forced />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
      <Stack.Screen name="(tabs)" />
      {['products', 'suppliers', 'expense-categories', 'branches'].map((r) => (
        <Stack.Screen key={r} name={`${r}/new`} options={{ presentation: 'modal' }} />
      ))}
      <Stack.Screen name="purchases/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="dispatches/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="payments/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="users/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="expenses/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="prices/set" options={{ presentation: 'modal' }} />
      <Stack.Screen name="prices/margin" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
