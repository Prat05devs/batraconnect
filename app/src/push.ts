import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
const native = Platform.OS !== 'web';
if (native)
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
export const projectId: string | undefined =
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
export type PushState = 'unsupported' | 'unconfigured' | 'denied' | 'undetermined' | 'granted';
export async function pushState(): Promise<PushState> {
  if (!native || !Device.isDevice) return 'unsupported';
  if (!projectId) return 'unconfigured';
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}
/** Returns this device's Expo push token. Prompts only when asked to; Android needs its channel before the prompt. */
export async function devicePushToken(prompt: boolean): Promise<string | null> {
  const state = await pushState();
  if (state === 'unsupported' || state === 'unconfigured') return null;
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Report and appointment updates',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  if (state !== 'granted') {
    if (!prompt || state === 'denied') return null;
    if (!(await Notifications.requestPermissionsAsync()).granted) return null;
  }
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}
/** Maps a server notification link (e.g. "complaint:<id>") to an app route. */
export function routeForLink(
  link: string | null | undefined,
): {
  pathname: '/submitted/[id]' | '/submitted-ideas/[id]' | '/appointments/[id]';
  params: { id: string };
} | null {
  const match = link?.match(/^(complaint|idea|appointment):([0-9a-f-]{36})$/);
  if (!match) return null;
  return {
    pathname:
      match[1] === 'complaint'
        ? '/submitted/[id]'
        : match[1] === 'idea'
          ? '/submitted-ideas/[id]'
          : '/appointments/[id]',
    params: { id: match[2] },
  };
}
