import { useRef, useState, type ComponentRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-context';
import { API_URL } from '@/auth/config';
import { Text } from '@/components/text';
import { Button, Card, ErrorBanner, Field } from '@/components/ui';
import { colors, space } from '@/theme/tokens';

export default function SignIn() {
  const { signIn, signingIn, signInError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);

  function submit() {
    setTouched(true);
    if (!username.trim() || !password) return;
    signIn(username.trim(), password);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: space.lg, paddingTop: 72, paddingBottom: space.xl }}>
          <View style={{ gap: space.md, paddingHorizontal: space.sm }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                backgroundColor: colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(162, 8, 12, 0.25)',
              }}>
              <Text variant="title" style={{ color: colors.surface }}>
                CT
              </Text>
            </View>
            <Text variant="display" accessibilityRole="header" style={{ lineHeight: 40, marginTop: space.md }}>
              ChickTrack
            </Text>
            <Text style={{ color: colors.secondary, lineHeight: 22 }}>
              Procurement, stock and branch sales in one place.
            </Text>
          </View>

          <Card style={{ marginTop: 48, padding: space.lg, paddingTop: 20, gap: space.lg }}>
            {signInError ? <ErrorBanner message={signInError} /> : null}
            <Field
              label="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              submitBehavior="submit"
              error={touched && !username.trim() ? 'Enter your username' : undefined}
            />
            <Field
              ref={passwordRef}
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
              error={touched && !password ? 'Enter your password' : undefined}
            />
            <View style={{ marginTop: space.sm }}>
              <Button title="Sign in" onPress={submit} loading={signingIn} />
            </View>
          </Card>

          <View style={{ flexGrow: 1 }} />
          <Text variant="monoSmall" style={{ textAlign: 'center', marginTop: space.xl, color: colors.secondary }}>
            {API_URL}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
