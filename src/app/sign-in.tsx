import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-context';
import { API_URL } from '@/auth/config';
import { Text } from '@/components/text';
import { Button, ErrorBanner } from '@/components/ui';
import { colors, space } from '@/theme/tokens';

export default function SignIn() {
  const { signIn, signingIn, signInError } = useAuth();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ flex: 1, padding: space.xl, justifyContent: 'center', gap: space.xl }}>
        <View style={{ gap: space.sm }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text variant="title" style={{ color: colors.surface }}>
              CT
            </Text>
          </View>
          <Text variant="largeTitle" accessibilityRole="header">
            ChickTrack
          </Text>
          <Text variant="caption">Buy, stock, dispatch and settle — in one place.</Text>
        </View>
        {signInError ? <ErrorBanner message={signInError} /> : null}
      </View>
      <View style={{ padding: space.xl, gap: space.md }}>
        <Button title="Sign in" onPress={signIn} loading={signingIn} />
        <Text variant="caption" style={{ textAlign: 'center' }}>
          Server: {API_URL}
        </Text>
      </View>
    </SafeAreaView>
  );
}
