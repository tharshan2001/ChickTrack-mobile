import { useQueryClient } from '@tanstack/react-query';
import { Tabs } from 'expo-router/js-tabs';
import type { ReactNode } from 'react';

import {
  BranchesTabIcon,
  HomeTabIcon,
  MoneyTabIcon,
  MoreTabIcon,
  StockTabIcon,
} from '@/components/icons';
import { Text } from '@/components/text';
import { colors, space, type as typography } from '@/theme/tokens';

type TabIcon = (props: { color: string; focused: boolean }) => ReactNode;

const tab = (title: string, Icon: TabIcon) => ({
  title,
  tabBarIcon: ({ focused, color }: { focused: boolean; color: unknown }) => (
    <Icon color={String(color)} focused={focused} />
  ),
  tabBarLabel: ({ focused }: { focused: boolean }) => (
    <Text
      variant="bodyMedium"
      style={{ ...(focused ? typography.tabActive : typography.tab), color: focused ? colors.ink : colors.secondary }}>
      {title}
    </Text>
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
        tabBarAllowFontScaling: false,
        tabBarStyle: {
          height: 84,
          paddingTop: 6,
          paddingBottom: 24,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.separator,
        },
        tabBarItemStyle: { gap: space.xs },
      }}>
      <Tabs.Screen name="index" options={tab('Home', HomeTabIcon)} />
      <Tabs.Screen name="stock" options={tab('Stock', StockTabIcon)} />
      <Tabs.Screen name="branches" options={tab('Branches', BranchesTabIcon)} />
      <Tabs.Screen name="money" options={tab('Money', MoneyTabIcon)} />
      <Tabs.Screen name="more" options={tab('Setup', MoreTabIcon)} />
    </Tabs>
  );
}
