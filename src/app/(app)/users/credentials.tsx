import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Share, View } from 'react-native';

import { API_URL } from '@/auth/config';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Button, Card, Notice, Separator, TextLink } from '@/components/ui';
import { credentialsStore } from '@/features/credentials-store';
import { colors, radius, space } from '@/theme/tokens';

const grouped = (password: string) => password.replace(/(.{4})(?=.)/g, '$1 ');

export default function Credentials() {
  const [issued] = useState(() => credentialsStore.take());
  const first = issued?.fullName.split(/\s+/)[0] ?? '';

  if (!issued) {
    return (
      <Screen title="Sign-in details" right={<TextLink title="Done" onPress={() => router.back()} />}>
        <Notice text="These details were shown once and are gone. Reset the password to get a new one." />
      </Screen>
    );
  }

  const share = () =>
    Share.share({
      message: `ChickTrack sign-in\nServer: ${API_URL}\nUsername: ${issued.username}\nTemporary password: ${issued.password}\nYou'll choose your own password when you sign in.`,
    });

  return (
    <Screen
      title={issued.reset ? `New password for ${first}` : `${first} can sign in`}
      right={<TextLink title="Done" onPress={() => router.back()} />}
      footer={
        <>
          <Button title="Share sign-in details" onPress={() => void share()} />
          <Button title="I've passed them on" variant="secondary" onPress={() => router.back()} />
        </>
      }
      headerExtra={
        <Text variant="body" style={{ color: colors.secondary, lineHeight: 22 }}>
          {issued.reset
            ? `${first} has been signed out. Pass these on; the app asks for a new password straight away.`
            : `Pass these on in person or by message. The app asks ${first} to choose a new password straight away.`}
        </Text>
      }>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.successBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Feather name="check" size={24} color={colors.success} />
      </View>
      <Card>
        <View style={{ minHeight: 64, paddingHorizontal: space.lg, paddingVertical: space.sm, justifyContent: 'center', gap: 2 }}>
          <Text variant="caption">Username</Text>
          <Text variant="num" selectable>
            {issued.username}
          </Text>
        </View>
        <Separator />
        <View style={{ minHeight: 72, paddingHorizontal: space.lg, paddingVertical: space.sm, justifyContent: 'center', gap: 2 }}>
          <Text variant="caption">{issued.generated ? 'Temporary password' : 'Password you typed'}</Text>
          <Text variant="monoTitle" selectable style={{ letterSpacing: 1.2 }}>
            {grouped(issued.password)}
          </Text>
        </View>
      </Card>
      <View
        accessibilityRole="alert"
        style={{
          flexDirection: 'row',
          gap: 10,
          padding: space.md,
          borderRadius: radius.field,
          backgroundColor: colors.warningBg,
          borderWidth: 1,
          borderColor: colors.warningBorder,
        }}>
        <Feather name="alert-triangle" size={18} color={colors.warning} style={{ marginTop: 1 }} />
        <Text variant="body" style={{ flex: 1, color: colors.warning, fontSize: 14, lineHeight: 20 }}>
          Shown only now. ChickTrack doesn&apos;t keep it. If it&apos;s lost, reset the password to get a new one.
        </Text>
      </View>
      <Notice icon={false} text="Long-press the username or password to copy it." />
    </Screen>
  );
}
