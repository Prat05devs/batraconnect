import React from 'react';
import { Text, LanguageSwitch, useLanguage } from '../../language';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../auth';
import { isStaff } from '../../api-client';
import { C, Icon, type IconName } from '../../ui';
const icons: Record<string, IconName> = {
  index: 'home-outline',
  services: 'grid-outline',
  guide: 'chatbubbles-outline',
  requests: 'document-text-outline',
  profile: 'person-outline',
  workspace: 'file-tray-outline',
  insights: 'bar-chart-outline',
};
/**
 * Tabs follow the signed-in account only. Citizens (and visitors) never see staff tabs.
 * Staff keep the public Services tab so they can use the whole app, plus their own work tabs.
 */
export default function TabLayout() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const staff = isStaff(session?.user.role) ? session!.user.role : null;
  const reports = !!staff;
  const dashboard = !!staff && ['department', 'executive', 'admin'].includes(staff);
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerRight: () => <LanguageSwitch />,
        headerTitle: () => (
          <Text style={{ fontSize: 22, fontWeight: '800', color: C.navy }}>
            Batra <Text style={{ color: C.blue }}>Connect</Text>
          </Text>
        ),
        headerShadowVisible: false,
        headerStyle: { backgroundColor: C.background },
        tabBarActiveTintColor: C.blue,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: {
          height: 64 + Math.max(insets.bottom, 12),
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 12),
          backgroundColor: C.white,
        },
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: 12 },
        tabBarIcon: ({ color }) => (
          <Icon name={route.name === 'index' && staff ? 'today-outline' : icons[route.name]} color={color} />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: t(staff ? 'Today' : 'Home') }} />
      <Tabs.Screen
        name="workspace"
        options={{ title: t(staff === 'field' ? 'My reports' : 'Reports'), href: reports ? undefined : null }}
      />
      <Tabs.Screen name="insights" options={{ title: t('Dashboard'), href: dashboard ? undefined : null }} />
      <Tabs.Screen name="services" options={{ title: t('Services') }} />
      <Tabs.Screen name="guide" options={{ title: t('Guide'), href: staff ? null : undefined }} />
      <Tabs.Screen
        name="requests"
        options={{ title: t('My requests'), tabBarLabel: t('Requests'), href: staff ? null : undefined }}
      />
      <Tabs.Screen name="profile" options={{ title: t(staff ? 'Account' : 'Profile') }} />
    </Tabs>
  );
}
