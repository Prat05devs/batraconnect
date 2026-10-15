import '../../global.css';
import { LanguageProvider, LanguageSwitch, Text, useLanguage } from '../language';
import React, { useEffect } from 'react';
import { AuthProvider } from '../auth';
import { ActivityIndicator, Platform, View } from 'react-native';
import { Pressable } from '@/components/pressable';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { PlanningProvider, usePlanning } from '../planning-store';
import { StoreProvider, useStore } from '../store';
import { SubmissionProvider } from '../submissions';
import { routeForLink } from '../push';
import { ConfigProvider } from '../app-config';
import { PortalHost } from '@rn-primitives/portal';
import { C, Icon, Notice } from '../ui';
// Screen titles; every screen except the modal guide and confirmation also shows Help.
const titles: Record<string, string> = {
  'sign-in': 'Sign in',
  'forgot-password': 'Reset password',
  verify: 'Verify your account',
  account: 'Account and security',
  'notification-settings': 'Notification settings',
  'submitted/index': 'Reports',
  'submitted/[id]': 'Report',
  updates: 'Updates',
  report: 'Report a problem',
  'request/[id]': 'Request details',
  ideas: 'Ideas & projects',
  'idea/new': 'Write an idea',
  'idea/[id]': 'Saved idea',
  'submitted-ideas/index': 'Ideas sent to the office',
  'submitted-ideas/[id]': 'Idea',
  meetings: 'Jan Samvad preparation',
  'meeting/new': 'Prepare notes',
  'meeting/[id]': 'Preparation notes',
  'appointments/index': 'Jan Samvad',
  'appointments/book': 'Book an appointment',
  'appointments/[id]': 'Appointment',
  'appointments/slots': 'Available times',
  schemes: 'Schemes & benefits',
  'scheme/[id]': 'Scheme details',
  roorkee: 'MLA of Roorkee',
  ministries: 'Ministerial responsibilities',
  achievements: 'Achievements & photos',
  'photo/[id]': 'Photo',
  'gallery/index': 'Photo gallery',
  'gallery/[page]': 'Gallery',
  projects: 'Development projects',
  'service/[id]': 'Department guide',
  'service/task/[id]': 'Service guide',
};
/** Opens the related report, idea or appointment when a push notification is tapped. */
function NotificationResponder() {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const route = routeForLink(response.notification.request.content.data?.link as string | undefined);
    if (route) {
      router.push(route);
      void Notifications.clearLastNotificationResponseAsync();
    }
  }, [response, router]);
  return null;
}
function Routes() {
  const router = useRouter();
  const { t } = useLanguage();
  const helpOptions = {
    headerRight: () => (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <LanguageSwitch />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Help using the app')}
          onPress={event => {
            if (Platform.OS === 'web') (event.currentTarget as unknown as { blur?: () => void }).blur?.();
            router.push('/help');
          }}
          style={({ pressed }) => ({
            minWidth: 48,
            minHeight: 48,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.65 : 1,
          })}
        >
          <Icon name="help-circle-outline" />
        </Pressable>
      </View>
    ),
  };
  const { ready, error } = useStore();
  const planning = usePlanning();
  if (!ready || !planning.ready)
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.background,
          gap: 16,
        }}
      >
        <LanguageSwitch />
        <ActivityIndicator size="large" color={C.blue} />
        <Text>Loading your workspace…</Text>
      </View>
    );
  const homeButton = () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('Home')}
      onPress={() => router.dismissTo('/')}
      style={({ pressed }) => ({
        minWidth: 48,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <Icon name="home-outline" color={C.navy} />
    </Pressable>
  );
  return (
    <>
      <StatusBar style="dark" />
      {Platform.OS !== 'web' && <NotificationResponder />}
      <Stack
        screenOptions={({ navigation }) => ({
          headerRight: () => <LanguageSwitch />,
          headerTintColor: C.navy,
          headerStyle: { backgroundColor: C.background },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: C.background },
          animation: 'none',
          ...(navigation.canGoBack() ? {} : { headerLeft: homeButton }),
        })}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {Object.entries(titles).map(([name, title]) => (
          <Stack.Screen
            key={name}
            name={name}
            options={{
              title: t(title),
              ...(name === 'sign-in' || name === 'forgot-password' ? {} : helpOptions),
              ...(name === 'report' ? { gestureEnabled: false } : {}),
            }}
          />
        ))}
        <Stack.Screen name="help" options={{ title: t('App guide'), presentation: 'modal' }} />
        <Stack.Screen
          name="confirmation"
          options={{ title: t('Report saved'), headerBackVisible: false, gestureEnabled: false }}
        />
      </Stack>
      {(error || planning.error) && (
        <View style={{ padding: 12, backgroundColor: C.background }}>
          <Notice error>{error || planning.error}</Notice>
        </View>
      )}
    </>
  );
}
export default function RootLayout() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ConfigProvider>
          <StoreProvider>
            <SubmissionProvider>
              <PlanningProvider>
                <Routes />
                <PortalHost />
              </PlanningProvider>
            </SubmissionProvider>
          </StoreProvider>
        </ConfigProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
