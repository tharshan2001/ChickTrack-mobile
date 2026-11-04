import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router/js-tabs';

import { colors, fonts } from '@/theme/tokens';

type IconName = keyof typeof Feather.glyphMap;

const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ focused, size }: { focused: boolean; size: number }) => (
    <Feather name={icon} size={size} color={focused ? colors.accent : colors.secondary} />
  ),
});

/** Owner navigation: Home, Stock, Branches, Money, More. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.secondary,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.separator },
      }}>
      <Tabs.Screen name="index" options={tab('Home', 'home')} />
      <Tabs.Screen name="stock" options={tab('Stock', 'layers')} />
      <Tabs.Screen name="branches" options={tab('Branches', 'map-pin')} />
      <Tabs.Screen name="money" options={tab('Money', 'credit-card')} />
      <Tabs.Screen name="more" options={tab('More', 'grid')} />
    </Tabs>
  );
}
