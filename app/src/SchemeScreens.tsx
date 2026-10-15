import { Text, useLanguage } from './language';
import React, { useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { Pressable } from '@/components/pressable';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { filterSchemes, getScheme, schemeCategories, type SchemeCategory } from './content/schemes';
import { usePlanning } from './planning-store';
import { visibleSavedSchemes } from './saved-schemes';
import { Body, Button, Card, C, Field, Icon, Notice, Page, Row, Section, Title, s } from './ui';
const checkedDate = (date: string, language: 'en' | 'hi') =>
  new Date(`${date}T00:00:00+05:30`).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
function Filters<T extends string>({
  label,
  values,
  selected,
  onSelect,
}: {
  label: string;
  values: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {values.map(value => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: value === selected }}
            onPress={() => onSelect(value)}
            style={({ pressed }) => ({
              minHeight: 48,
              justifyContent: 'center',
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: value === selected ? C.blue : C.border,
              backgroundColor: value === selected ? C.pale : C.white,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={[s.label, { color: value === selected ? C.blue : C.navy }]}>{value}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function Schemes() {
  const { language } = useLanguage();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SchemeCategory>('All');
  const [scope, setScope] = useState<'All' | 'Uttarakhand' | 'Central'>('All');
  const planning = usePlanning();
  const [view, setView] = useState<'All schemes' | 'Saved schemes'>('All schemes');
  const visible = visibleSavedSchemes(
    filterSchemes(query, category, scope),
    planning.savedSchemes,
    view === 'Saved schemes',
  );
  return (
    <Page>
      <Title>Schemes & benefits</Title>
      <Body>Explore support for you and your family from government sources.</Body>
      <Text style={s.small}>Selected catalogue · Sources reviewed 8 Oct 2026</Text>
      <Filters
        label="Show"
        values={['All schemes', 'Saved schemes'] as const}
        selected={view}
        onSelect={setView}
      />
      <Field
        label="Search schemes"
        value={query}
        onChangeText={setQuery}
        maxLength={100}
        placeholder="Try pension, किसान or business"
      />
      <Filters label="Category" values={schemeCategories} selected={category} onSelect={setCategory} />
      <Filters
        label="Scheme scope"
        values={['All', 'Uttarakhand', 'Central'] as const}
        selected={scope}
        onSelect={setScope}
      />
      <Text accessibilityLiveRegion="polite" style={s.label}>
        {visible.length} {visible.length === 1 ? 'scheme' : 'schemes'} found
      </Text>
      {visible.map(scheme => (
        <Row
          navigates
          key={scheme.id}
          title={scheme.name}
          detail={`${language === 'en' ? scheme.hindiName + '\n' : ''}${scheme.scope} · ${scheme.benefit}`}
          icon={
            scheme.category === 'Pensions'
              ? 'people-outline'
              : scheme.category === 'Agriculture'
                ? 'leaf-outline'
                : scheme.category === 'Self-employment'
                  ? 'briefcase-outline'
                  : 'heart-outline'
          }
          onPress={() => router.push({ pathname: '/scheme/[id]', params: { id: scheme.id } })}
        />
      ))}
      {!visible.length && (
        <Card>
          <Icon name="search-outline" size={36} />
          <Section>
            {view === 'Saved schemes' && !planning.savedSchemes.length
              ? 'No saved schemes yet'
              : 'No matching schemes'}
          </Section>
          <Body>
            {view === 'Saved schemes' && !planning.savedSchemes.length
              ? 'Open a scheme and choose Save scheme to find it here later.'
              : 'Try a broader term or reset your filters. This is a selected catalogue, not every available scheme.'}
          </Body>
          <Button
            secondary
            label="Reset search and filters"
            onPress={() => {
              setQuery('');
              setCategory('All');
              setScope('All');
              setView('All schemes');
            }}
          />
        </Card>
      )}
      <Notice>
        Summaries work offline. Follow official links for current rules and application availability. The
        responsible department decides eligibility.
      </Notice>
    </Page>
  );
}
export function SchemeDetail() {
  const { language } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = getScheme(id);
  const [error, setError] = useState('');
  const planning = usePlanning();
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const saveLock = useRef(false);
  if (!scheme)
    return (
      <Page>
        <Title>Scheme unavailable</Title>
        <Body>This scheme is not in the app’s catalogue.</Body>
        <Button label="Browse schemes" onPress={() => router.dismissTo('/schemes')} />
      </Page>
    );
  async function toggle() {
    if (saveLock.current || !scheme) return;
    saveLock.current = true;
    setSaving(true);
    setError('');
    setFeedback('');
    const wasSaved = planning.savedSchemes.includes(scheme.id);
    try {
      await planning.toggleScheme(scheme.id);
      setFeedback(wasSaved ? 'Removed from saved schemes.' : 'Scheme saved on this device.');
    } catch {
      setError('Could not update saved schemes. Please try again.');
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }
  function open(url: string) {
    setError('');
    void Linking.openURL(url).catch(() =>
      setError('The website could not be opened. Check your connection and try again.'),
    );
  }
  return (
    <Page>
      <Text style={s.badge}>
        {scheme.scope} · {scheme.category}
      </Text>
      <Title>{scheme.name}</Title>
      {language === 'en' && <Body>{scheme.hindiName}</Body>}
      {error ? <Notice error>{error}</Notice> : null}
      <Button
        secondary
        disabled={saving}
        label={
          saving
            ? 'Saving…'
            : planning.savedSchemes.includes(scheme.id)
              ? 'Remove from saved schemes'
              : 'Save scheme'
        }
        icon="bookmark-outline"
        onPress={() => {
          void toggle();
        }}
      />
      {feedback ? <Notice>{feedback}</Notice> : null}
      <Card>
        <Section>Support offered</Section>
        <Body>{scheme.benefit}</Body>
      </Card>
      <Section>Eligibility summary</Section>
      {scheme.eligibility.map((item, index) => (
        <Body key={item}>
          {index + 1}. {item}
        </Body>
      ))}
      <Notice>
        This is a summary, not an eligibility decision. Check the source’s full rules and current process
        before applying.
      </Notice>
      <Section>Documents to prepare</Section>
      {scheme.documents.map(item => (
        <Body key={item}>• {item}</Body>
      ))}
      {scheme.documentsNote && <Body>{scheme.documentsNote}</Body>}
      <Section>How to apply</Section>
      <Body>{scheme.howToApply}</Body>
      {scheme.application && (
        <>
          <Button
            label={scheme.application.label}
            icon="open-outline"
            onPress={() => open(scheme.application!.url)}
          />
          <Text style={s.small}>{new URL(scheme.application.url).hostname} · Opens outside the app</Text>
          {scheme.application.verificationNote && (
            <Text style={s.small}>{scheme.application.verificationNote}</Text>
          )}
        </>
      )}
      <Card>
        <Section>Source & review date</Section>
        <Text style={s.label}>{scheme.source.publisher}</Text>
        <Body>{scheme.source.title}</Body>
        {scheme.source.edition && <Text style={s.small}>{scheme.source.edition}</Text>}
        <Text style={s.small}>
          Source reviewed {checkedDate(scheme.source.checkedOn, language)}. This is a manually reviewed
          snapshot; rules can change.
        </Text>
        <Button
          secondary
          label="Read government source"
          icon="open-outline"
          onPress={() => open(scheme.source.url)}
        />
        <Text selectable style={s.small}>
          {new URL(scheme.source.url).hostname}
        </Text>
      </Card>
      <Text style={s.small}>No application or personal documents are collected by this page.</Text>
    </Page>
  );
}
