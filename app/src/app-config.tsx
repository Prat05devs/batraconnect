import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, useAuth } from './auth';
import { Text } from './language';
import { Ionicons } from '@expo/vector-icons';
type Audience = { citizens: boolean; officers: boolean };
export type AppConfig = {
  features: { reports: Audience; ideas: Audience; appointments: Audience };
  maintenanceMessage: string;
  /** Citizens must verify an email or mobile number before sending (server setting REQUIRE_VERIFIED_CONTACT). */
  verificationRequired?: boolean;
  /** The server can email codes: one-time sign-in, verification and password reset. */
  email?: boolean;
};
const KEY = 'batra-connect.config.v1',
  allOn: Audience = { citizens: true, officers: true };
const fallback: AppConfig = {
  features: { reports: allOn, ideas: allOn, appointments: allOn },
  maintenanceMessage: '',
};
const Context = createContext<AppConfig>(fallback);
/**
 * Settings changed in the web dashboard (feature switches, maintenance banner). Loaded at launch and
 * whenever the app returns to the foreground; the last copy is kept so the app behaves the same offline.
 */
export function ConfigProvider({ children }: React.PropsWithChildren) {
  const [config, setConfig] = useState(fallback);
  useEffect(() => {
    let active = true;
    const load = () =>
      api<AppConfig>('/config')
        .then(value => {
          if (!active) return;
          setConfig(value);
          void AsyncStorage.setItem(KEY, JSON.stringify(value)).catch(() => {});
        })
        .catch(() => {});
    void AsyncStorage.getItem(KEY)
      .then(raw => {
        if (raw && active) setConfig(JSON.parse(raw) as AppConfig);
      })
      .catch(() => {})
      .finally(load);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void load();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return <Context.Provider value={config}>{children}</Context.Provider>;
}
/** Whether the server can email codes. A copy saved before this setting existed counts as yes. */
export function useEmailCodes() {
  return useContext(Context).email !== false;
}
/** Whether citizens must verify a contact before sending. A copy saved before this setting existed counts as yes. */
export function useVerificationRequired() {
  return useContext(Context).verificationRequired !== false;
}
/** Whether the signed-in citizen must still verify a contact before sending reports, ideas or bookings. */
export function useNeedsVerification() {
  const required = useVerificationRequired();
  const user = useAuth().session?.user;
  return required && !!user && user.role === 'citizen' && !user.emailVerified && !user.phoneVerified;
}
/** Whether the signed-in person (or a visitor, treated as a citizen) may use a feature right now. */
export function useFeature(name: keyof AppConfig['features']) {
  const { features } = useContext(Context);
  const { session } = useAuth();
  const role = session?.user.role ?? 'citizen';
  return features[name]?.[role === 'citizen' ? 'citizens' : 'officers'] !== false;
}
export function MaintenanceBanner() {
  const { maintenanceMessage } = useContext(Context);
  if (!maintenanceMessage) return null;
  // Rendered at the top of every page's content, so it never collides with the notch or status bar.
  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
        backgroundColor: '#FFF6DB',
        borderRadius: 12,
        padding: 12,
      }}
    >
      <Ionicons name="construct-outline" color="#8A6100" size={18} />
      <Text verbatim style={{ flex: 1, color: '#5C4100', fontSize: 14 }}>
        {maintenanceMessage}
      </Text>
    </View>
  );
}
