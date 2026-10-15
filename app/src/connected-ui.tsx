import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, View } from 'react-native';
import { Switch } from '@/components/ui/switch';
import { Badge as UIBadge } from '@/components/ui/badge';
import { Button as UIButton } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from './auth';
import { Text, useLanguage } from './language';
import { errorText, statusLabel } from './labels';
import { districts } from './model';
import { Body, Button, C, Card, Icon, Notice, Page, Row, Title, s, type IconName } from './ui';

export const useCopy = () => {
  const { language } = useLanguage();
  return useCallback((en: string, hi: string) => (language === 'hi' ? hi : en), [language]);
};
export function useFormat() {
  const { language } = useLanguage();
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  return {
    date: (iso: string | null | undefined) =>
      iso
        ? `${new Date(iso).toLocaleString(locale, { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST`
        : '',
    day: (iso: string) =>
      new Date(iso).toLocaleDateString(locale, {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }),
    time: (iso: string) =>
      new Date(iso).toLocaleTimeString(locale, {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
      }),
    status: (value: string) => statusLabel(value, language),
    error: (error: unknown) => errorText(error, language),
    district: (key: string) => {
      const d = districts.find(x => x.name.toLowerCase() === key.toLowerCase());
      return d ? (language === 'hi' ? d.hi : d.name) : key;
    },
  };
}
/**
 * Loads data when the screen gains focus and, if `pollMs` is set, refreshes it while the screen stays
 * focused and the app is in the foreground. Stale responses from earlier loads are ignored.
 */
export function useResource<T>(loader: () => Promise<T>, deps: React.DependencyList, pollMs = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const sequence = useRef(0);
  const latest = useRef(loader);
  useEffect(() => {
    latest.current = loader;
  });
  // Reload when any plain-value dependency changes (functions such as `call` are read through `latest`).
  const key = deps.map(d => (typeof d === 'function' ? '' : JSON.stringify(d ?? null))).join('|');
  const load = useCallback(
    async (quiet = false) => {
      const mine = ++sequence.current;
      if (!quiet) setLoading(true);
      try {
        const value = await latest.current();
        if (mine === sequence.current) {
          setData(value);
          setError(null);
        }
      } catch (e) {
        if (mine === sequence.current) setError(e);
      } finally {
        if (mine === sequence.current) setLoading(false);
      }
    },
    // `key` is the serialised dependency list; the loader itself is read through `latest`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  useFocusEffect(
    useCallback(() => {
      void load();
      if (!pollMs) return;
      let timer = setInterval(() => {
        if (AppState.currentState === 'active') void load(true);
      }, pollMs);
      const subscription = AppState.addEventListener('change', state => {
        if (state === 'active') {
          void load(true);
          clearInterval(timer);
          timer = setInterval(() => void load(true), pollMs);
        }
      });
      return () => {
        clearInterval(timer);
        subscription.remove();
      };
    }, [load, pollMs]),
  );
  return { data, setData, error, loading, reload: load };
}
const tones: Record<string, [string, string]> = {
  Submitted: ['#075BD8', '#EAF2FF'],
  Assigned: ['#6943B8', '#F2EDFC'],
  'In progress': ['#8A6100', '#FFF6DB'],
  Resolved: ['#087B62', '#E9F7F1'],
  Closed: ['#3B4A60', '#EEF1F6'],
  Reopened: ['#B42318', '#FFF0EC'],
  Requested: ['#075BD8', '#EAF2FF'],
  Confirmed: ['#087B62', '#E9F7F1'],
  Declined: ['#B42318', '#FFF0EC'],
  Cancelled: ['#3B4A60', '#EEF1F6'],
  Completed: ['#087B62', '#E9F7F1'],
  Missed: ['#B42318', '#FFF0EC'],
  'Under review': ['#8A6100', '#FFF6DB'],
  Accepted: ['#087B62', '#E9F7F1'],
  Implemented: ['#087B62', '#E9F7F1'],
  'Not taken forward': ['#3B4A60', '#EEF1F6'],
  Hidden: ['#B42318', '#FFF0EC'],
  draft: ['#8A6100', '#FFF6DB'],
  published: ['#087B62', '#E9F7F1'],
  archived: ['#3B4A60', '#EEF1F6'],
  active: ['#087B62', '#E9F7F1'],
  suspended: ['#B42318', '#FFF0EC'],
  overdue: ['#B42318', '#FFF0EC'],
  escalated: ['#B42318', '#FFF0EC'],
};
export function Badge({ value, label }: { value: string; label?: string }) {
  const f = useFormat();
  const [color, background] = tones[value] ?? [C.navy, C.pale];
  return (
    <UIBadge
      variant="outline"
      className="self-start rounded-lg border-transparent px-2.5 py-1.5"
      style={{ backgroundColor: background }}
    >
      <Text verbatim style={{ color, fontSize: 13, fontWeight: '700' }}>
        {label ?? f.status(value)}
      </Text>
    </UIBadge>
  );
}
export function Chips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text verbatim style={s.label}>
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
        accessibilityRole="radiogroup"
      >
        {options.map(o => (
          <UIButton
            key={o.value}
            variant={value === o.value ? 'default' : 'outline'}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === o.value }}
            onPress={() => onChange(o.value)}
            className="h-11 rounded-full px-4"
          >
            <Text
              verbatim
              style={{ fontWeight: '600' }}
              className={value === o.value ? 'text-primary-foreground' : 'text-foreground'}
            >
              {o.label}
            </Text>
          </UIButton>
        ))}
      </ScrollView>
    </View>
  );
}
export function Toggle({
  label,
  detail,
  value,
  onChange,
  disabled,
}: {
  label: string;
  detail?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View className="min-h-[64px] flex-row items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
      <View style={{ flex: 1, gap: 4 }}>
        <Text verbatim style={s.rowTitle}>
          {label}
        </Text>
        {detail ? (
          <Text verbatim style={s.small}>
            {detail}
          </Text>
        ) : null}
      </View>
      <Switch accessibilityLabel={label} checked={value} onCheckedChange={onChange} disabled={disabled} />
    </View>
  );
}
/** A collapsible single-choice list; long lists stay out of the way until opened. */
export function Picker({
  label,
  value,
  options,
  onChange,
  placeholder,
  icon = 'list-outline',
}: {
  label: string;
  value: string;
  options: { value: string; label: string; detail?: string }[];
  onChange: (value: string) => void;
  placeholder: string;
  icon?: IconName;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <View style={{ gap: 8 }}>
      <Text verbatim style={s.label}>
        {label}
      </Text>
      <Row
        verbatim
        title={selected?.label ?? placeholder}
        detail={selected?.detail}
        icon={icon}
        onPress={() => setOpen(!open)}
      />
      {open && (
        <View style={{ gap: 8, paddingLeft: 8 }}>
          {options.map(o => (
            <Row
              verbatim
              key={o.value}
              title={o.label}
              detail={o.detail}
              icon="ellipse-outline"
              selected={o.value === value}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
export function Stat({
  value,
  label,
  tone = C.navy,
  onPress,
}: {
  value: number | string;
  label: string;
  tone?: string;
  onPress?: () => void;
}) {
  const body = (
    <>
      <Text verbatim style={{ fontSize: 28, fontWeight: '800', color: tone }}>
        {value}
      </Text>
      <Text verbatim style={s.small}>
        {label}
      </Text>
    </>
  );
  const className = cn(
    'min-w-[140px] flex-1 gap-1 rounded-2xl border border-border bg-card p-4',
    onPress && 'active:opacity-70',
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} className={className}>
      {body}
    </Pressable>
  ) : (
    <View className={className}>{body}</View>
  );
}
export const Stats = ({ children }: React.PropsWithChildren) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{children}</View>
);
export function Bar({
  label,
  value,
  max,
  detail,
  color = C.blue,
}: {
  label: string;
  value: number;
  max: number;
  detail?: string;
  color?: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${detail ? `, ${detail}` : ''}`}
      style={{ gap: 6 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <Text verbatim style={[s.label, { flex: 1 }]}>
          {label}
        </Text>
        <Text verbatim style={s.label}>
          {value}
        </Text>
      </View>
      <View style={{ height: 10, backgroundColor: C.pale, borderRadius: 5, overflow: 'hidden' }}>
        <View
          style={{
            width: `${max ? Math.max(2, (value / max) * 100) : 0}%`,
            height: 10,
            backgroundColor: color,
          }}
        />
      </View>
      {detail ? (
        <Text verbatim style={s.small}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}
export function Loading({ busy, error, onRetry }: { busy: boolean; error: unknown; onRetry?: () => void }) {
  const f = useFormat();
  const copy = useCopy();
  return (
    <>
      {busy ? (
        <ActivityIndicator color={C.blue} accessibilityLabel={copy('Loading', 'लोड हो रहा है')} />
      ) : null}
      {error ? (
        <>
          <Notice error>{f.error(error)}</Notice>
          {onRetry ? (
            <Button secondary label={copy('Try again', 'फिर प्रयास करें')} onPress={onRetry} />
          ) : null}
        </>
      ) : null}
    </>
  );
}
export function Empty({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <Card>
      <Icon name={icon} size={36} />
      <Text verbatim style={s.section}>
        {title}
      </Text>
      <Body verbatim>{body}</Body>
    </Card>
  );
}
export function SignInGate() {
  const router = useRouter();
  const copy = useCopy();
  return (
    <Page>
      <Title verbatim>{copy('Sign in to continue', 'आगे बढ़ने के लिए लॉगिन करें')}</Title>
      <Body verbatim>
        {copy(
          'This part of Batra Connect needs your account.',
          'बत्रा कनेक्ट के इस भाग के लिए आपका खाता आवश्यक है।',
        )}
      </Body>
      <Button label={copy('Sign in', 'लॉगिन करें')} onPress={() => router.push('/sign-in')} />
    </Page>
  );
}
/** Renders children only for a signed-in account whose role is allowed; keyed by account so state never leaks between users. */
export function Gate({
  roles,
  resident = false,
  children,
}: {
  roles?: string[];
  resident?: boolean;
  children: () => React.ReactNode;
}) {
  const { session } = useAuth();
  const copy = useCopy();
  if (!session) return <SignInGate />;
  if (resident && session.user.role === 'executive') return <OversightOnly />;
  if (roles && !roles.includes(session.user.role))
    return (
      <Page>
        <Title verbatim>{copy('Not available for your account', 'आपके खाते के लिए उपलब्ध नहीं')}</Title>
        <Body verbatim>
          {copy('Ask an administrator if you need this access.', 'यह अनुमति चाहिए तो प्रशासक से पूछें।')}
        </Body>
      </Page>
    );
  return <React.Fragment key={session.user.id}>{children()}</React.Fragment>;
}
/** Shown to executive accounts on resident-only screens (reporting, ideas, booking). */
export function OversightOnly() {
  const router = useRouter();
  const copy = useCopy();
  return (
    <Page>
      <Title verbatim>{copy('Not part of this account', 'यह इस खाते का भाग नहीं है')}</Title>
      <Body verbatim>
        {copy(
          'This account oversees reports, ideas and Jan Samvad through the dashboard. Reporting, suggestions and bookings are made from resident and officer accounts.',
          'यह खाता डैशबोर्ड के माध्यम से रिपोर्ट, सुझाव और जन संवाद की निगरानी करता है। रिपोर्ट, सुझाव और बुकिंग निवासी और अधिकारी खातों से की जाती हैं।',
        )}
      </Body>
      <Button label={copy('Go to Today', 'आज पर जाएँ')} onPress={() => router.dismissTo('/')} />
    </Page>
  );
}
