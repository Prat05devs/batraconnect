import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Text as NativeText, View, type TextProps } from 'react-native';
import { Pressable } from '@/components/pressable';
import { Text as UIText } from '@/components/ui/text';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translate, type Language } from './translations';
import { createLanguagePreference } from './language-preference';
const Context = createContext({
  language: 'en' as Language,
  setLanguage: (_language: Language) => {},
  t: (text: string) => text,
});
export function LanguageProvider({ children }: React.PropsWithChildren) {
  const [language, updateLanguage] = useState<Language>('en');
  const [error, setError] = useState(false);
  const preference = useRef<ReturnType<typeof createLanguagePreference> | null>(null);
  useEffect(() => {
    const controller = createLanguagePreference(AsyncStorage, updateLanguage, setError);
    preference.current = controller;
    void controller.hydrate();
    return () => controller.dispose();
  }, []);
  function setLanguage(next: Language) {
    void preference.current?.select(next);
  }
  return (
    <Context.Provider value={{ language, setLanguage, t: text => translate(text, language) }}>
      {children}
      {error && (
        <NativeText
          accessibilityLiveRegion="polite"
          style={{ backgroundColor: '#FFF0EC', padding: 12, color: '#B42318' }}
        >
          {language === 'hi'
            ? 'भाषा की पसंद पढ़ी या सहेजी नहीं जा सकी। इस सत्र में चुनी भाषा उपलब्ध है।'
            : 'Language preference could not be loaded or saved. Your selected language still works for this session.'}
        </NativeText>
      )}
    </Context.Provider>
  );
}
export function useLanguage() {
  return useContext(Context);
}
const NestedText = createContext(false);
export function Text({
  children,
  verbatim = false,
  ...props
}: TextProps & { verbatim?: boolean; className?: string }) {
  const { t } = useLanguage();
  const nested = useContext(NestedText);
  function localize(value: React.ReactNode): React.ReactNode {
    return typeof value === 'string' ? t(value) : Array.isArray(value) ? value.map(localize) : value;
  }
  const label =
    props.accessibilityLabel && !verbatim ? t(props.accessibilityLabel) : props.accessibilityLabel;
  const content = verbatim ? children : localize(children);
  // Nested text inherits its parent's size and colour (React Native behaviour); top-level text uses
  // the React Native Reusables Text so it picks up shadcn colours from Button/Card/Badge context.
  if (nested)
    return (
      <NativeText {...props} accessibilityLabel={label}>
        {content}
      </NativeText>
    );
  return (
    <NestedText.Provider value={true}>
      <UIText {...props} accessibilityLabel={label}>
        {content}
      </UIText>
    </NestedText.Provider>
  );
}
export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Language / भाषा"
      style={{ flexDirection: 'row', gap: 2, borderRadius: 12, backgroundColor: '#EAF2FF' }}
    >
      {(['en', 'hi'] as const).map(value => (
        <Pressable
          key={value}
          accessibilityRole="radio"
          accessibilityLabel={value === 'en' ? 'Switch to English' : 'हिन्दी में पढ़ें'}
          accessibilityState={{ checked: language === value }}
          onPress={() => setLanguage(value)}
          style={({ pressed }) => ({
            minWidth: 48,
            minHeight: 48,
            paddingHorizontal: 8,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            backgroundColor: language === value ? '#0C2148' : 'transparent',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <NativeText
            style={{ fontSize: 14, fontWeight: '600', color: language === value ? '#FFFFFF' : '#0C2148' }}
          >
            {value === 'en' ? 'EN' : 'हिन्दी'}
          </NativeText>
        </Pressable>
      ))}
    </View>
  );
}
