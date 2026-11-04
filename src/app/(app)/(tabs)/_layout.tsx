import Feather from '@expo/vector-icons/Feather';
import { useQueryClient } from '@tanstack/react-query';
import { Tabs } from 'expo-router/js-tabs';

import { colors, type } from '@/theme/tokens';

type IconName = keyof typeof Feather.glyphMap;

const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ focused, size }: { focused: boolean; size: number }) => (
    <Feather name={icon} size={size} color={focused ? colors.accent : colors.secondary} />
  ),
});

/** Owner navigation: Home, Stock, Branches, Money, More. */
export default function TabsLayout() {
  const qc = useQueryClient();
  return (
    <Tabs
      // Tabs stay mounted, so reload anything older than the stale time when a tab is shown.
      screenListeners={{ focus: () => void qc.refetchQueries({ type: 'active', stale: true }) }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.secondary,
        tabBarLabelStyle: type.tab,
        tabBarAllowFontScaling: false,
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
