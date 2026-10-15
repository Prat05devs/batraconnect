import { Text, useLanguage } from './language';
import React from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  type ColorValue,
  type ImageSourcePropType,
  type TextInputProps,
} from 'react-native';
import { Button as UIButton } from '@/components/ui/button';
import { Card as UICard } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { MaintenanceBanner } from './app-config';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { Ionicons } from '@expo/vector-icons';
export const C = {
  navy: '#0C2148',
  blue: '#075BD8',
  background: '#F5F7FB',
  white: '#FFFFFF',
  muted: '#53627A',
  border: '#D9E0EB',
  pale: '#EAF2FF',
  green: '#087B62',
  red: '#B42318',
};
export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export const Icon = ({
  name,
  color = C.blue,
  size = 24,
}: {
  name: IconName;
  color?: ColorValue;
  size?: number;
}) => (
  <Ionicons
    name={name}
    size={size}
    color={color}
    accessible={false}
    aria-hidden={true}
    accessibilityElementsHidden={true}
    importantForAccessibility="no-hide-descendants"
  />
);
export function Page({ children }: React.PropsWithChildren) {
  const headerHeight = useHeaderHeight();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
        <MaintenanceBanner />
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export const Title = ({ children, verbatim }: React.PropsWithChildren<{ verbatim?: boolean }>) => (
  <Text verbatim={verbatim} accessibilityRole="header" style={s.title}>
    {children}
  </Text>
);
export const Body = ({ children, verbatim }: React.PropsWithChildren<{ verbatim?: boolean }>) => (
  <Text verbatim={verbatim} style={s.body}>
    {children}
  </Text>
);
export const Section = ({ children, verbatim }: React.PropsWithChildren<{ verbatim?: boolean }>) => (
  <Text verbatim={verbatim} accessibilityRole="header" style={s.section}>
    {children}
  </Text>
);
/** shadcn/ui Button (React Native Reusables): primary or secondary, full-width, 52pt tall for touch. */
export function Button({
  label,
  onPress,
  secondary = false,
  disabled = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: IconName;
}) {
  return (
    <UIButton
      variant={secondary ? 'secondary' : 'default'}
      size="lg"
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      className="min-h-[52px] w-full rounded-xl px-4 py-3"
    >
      <Text
        style={s.buttonText}
        className={secondary ? 'text-secondary-foreground' : 'text-primary-foreground'}
      >
        {label}
      </Text>
      {icon && <Icon name={icon} color={secondary ? C.blue : C.white} size={20} />}
    </UIButton>
  );
}
/** shadcn/ui Card (React Native Reusables). */
export function Card({ children }: React.PropsWithChildren) {
  return <UICard className="gap-3 rounded-2xl px-5 py-5">{children}</UICard>;
}
export function Row({
  title,
  detail,
  icon,
  onPress,
  color = C.blue,
  tint = C.pale,
  selected = false,
  navigates = false,
  verbatim = false,
  titleVerbatim = verbatim,
}: {
  title: string;
  detail?: string;
  icon: IconName;
  onPress: () => void;
  color?: string;
  tint?: string;
  selected?: boolean;
  navigates?: boolean;
  verbatim?: boolean;
  titleVerbatim?: boolean;
}) {
  return (
    <Pressable
      onPress={event => {
        if (navigates && Platform.OS === 'web')
          (event.currentTarget as unknown as { blur?: () => void }).blur?.();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={cn(
        'min-h-[64px] flex-row items-center gap-3.5 rounded-2xl border bg-card p-4 active:opacity-70',
        selected ? 'border-primary bg-accent' : 'border-border',
      )}
    >
      <View style={[s.iconBox, { backgroundColor: tint }]}>
        <Icon name={icon} color={color} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text verbatim={titleVerbatim} style={s.rowTitle}>
          {title}
        </Text>
        {detail && (
          <Text verbatim={verbatim} style={s.small}>
            {detail}
          </Text>
        )}
      </View>
      <Icon
        name={selected ? 'checkmark-circle' : 'chevron-forward'}
        size={20}
        color={selected ? C.blue : C.muted}
      />
    </Pressable>
  );
}
/** shadcn/ui Input with a visible label; 52pt tall, translated label and placeholder. */
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { t } = useLanguage();
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>{label}</Text>
      <Input
        accessibilityLabel={t(label)}
        placeholderTextColor={C.muted}
        {...props}
        placeholder={props.placeholder ? t(props.placeholder) : undefined}
        className={props.multiline ? 'h-auto min-h-[144px] rounded-xl py-3' : 'h-[52px] rounded-xl'}
        style={[
          { fontSize: 16, color: C.navy },
          props.multiline && { textAlignVertical: 'top' },
          props.style,
        ]}
      />
    </View>
  );
}
export const Notice = ({ children, error = false }: React.PropsWithChildren<{ error?: boolean }>) => (
  <View className={cn('flex-row gap-2.5 rounded-xl p-3.5', error ? 'bg-destructive/10' : 'bg-accent')}>
    <Icon
      name={error ? 'alert-circle-outline' : 'information-circle-outline'}
      color={error ? C.red : C.blue}
      size={20}
    />
    <Text
      accessibilityLiveRegion={error ? 'assertive' : 'polite'}
      style={[s.small, { flex: 1, color: error ? C.red : C.navy }]}
    >
      {children}
    </Text>
  </View>
);
/**
 * Shows the whole photo at its true proportions, never cropped or stretched. It measures the space it is
 * given (percentage widths with aspectRatio overflow on iOS) and uses the asset's own size, or the loaded
 * image's size, for the ratio. Tall photos are capped at maxHeight and centred.
 */
export function FitImage({
  source,
  ratio,
  label,
  maxHeight,
  radius = 16,
}: {
  source: ImageSourcePropType;
  ratio?: number;
  label?: string;
  maxHeight?: number;
  radius?: number;
}) {
  const known = React.useMemo(() => {
    if (ratio) return ratio;
    if (typeof source !== 'number') return null;
    const asset = Image.resolveAssetSource?.(source);
    return asset?.width && asset?.height ? asset.width / asset.height : null;
  }, [ratio, source]);
  const [loaded, setLoaded] = React.useState<number | null>(null);
  const [available, setAvailable] = React.useState(0);
  const r = known ?? loaded ?? 4 / 3;
  let width = available,
    height = available / r;
  if (maxHeight && height > maxHeight) {
    height = maxHeight;
    width = maxHeight * r;
  }
  return (
    <View
      onLayout={event => setAvailable(Math.floor(event.nativeEvent.layout.width))}
      style={{ alignSelf: 'stretch', alignItems: 'center' }}
    >
      {available > 0 && (
        <Image
          source={source}
          accessible={!!label}
          accessibilityLabel={label}
          onLoad={event => {
            const size = (event.nativeEvent as { source?: { width?: number; height?: number } }).source;
            if (!known && size?.width && size?.height) setLoaded(size.width / size.height);
          }}
          style={{ width, height, borderRadius: radius, backgroundColor: C.pale }}
          resizeMode="contain"
        />
      )}
    </View>
  );
}
export const s = StyleSheet.create({
  page: { padding: 24, gap: 20, width: '100%', maxWidth: 700, alignSelf: 'center', paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: '700', color: C.navy, lineHeight: 38 },
  body: { fontSize: 16, color: C.muted, lineHeight: 25 },
  small: { fontSize: 14, color: C.muted, lineHeight: 21 },
  section: { fontSize: 20, fontWeight: '700', color: C.navy, marginTop: 4 },
  card: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    gap: 12,
  },
  button: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: C.blue,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: { backgroundColor: C.pale },
  buttonText: { flexShrink: 1, fontSize: 16, fontWeight: '700', color: C.white },
  row: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.white,
  },
  rowTitle: { fontSize: 16, fontWeight: '600', color: C.navy },
  iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 15, fontWeight: '600', color: C.navy },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#8795AA',
    backgroundColor: C.white,
    padding: 14,
    borderRadius: 12,
    color: C.navy,
    fontSize: 16,
  },
  notice: { flexDirection: 'row', gap: 10, padding: 14, backgroundColor: C.pale, borderRadius: 12 },
  badge: {
    color: C.green,
    backgroundColor: '#E9F7F1',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
});
