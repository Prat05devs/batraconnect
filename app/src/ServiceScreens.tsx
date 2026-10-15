import { Text, useLanguage } from './language';
import React, { useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { Pressable } from '@/components/pressable';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  departmentGuides,
  reviewedOn,
  searchDepartments,
  searchServiceTasks,
  serviceTasks,
  type Reference,
} from './content/services';
import { officialSources } from './content/catalog';
import { usePlanning } from './planning-store';
import { Body, Button, Card, C, Field, Icon, Notice, Page, Row, Section, Title, s } from './ui';
export function Services() {
  const { t } = useLanguage();
  const router = useRouter();
  const { bookmarks } = usePlanning();
  const [query, setQuery] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const sources = searchDepartments(query, savedOnly, bookmarks, officialSources);
  const matches = searchServiceTasks(query, savedOnly, bookmarks);
  const searching = Boolean(query.trim());
  return (
    <Page>
      <Title>Services & departments</Title>
      <Body>
        Read the steps and prepare here. Continue to an official portal when you are ready to apply.
      </Body>
      <Field
        label="Search departments or tasks"
        value={query}
        onChangeText={setQuery}
        maxLength={100}
        placeholder="Try transport or biotechnology"
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {[
          { title: 'All departments', value: false },
          { title: 'Saved departments', value: true },
        ].map(filter => (
          <Pressable
            key={filter.title}
            accessibilityRole="button"
            accessibilityState={{ selected: savedOnly === filter.value }}
            onPress={() => setSavedOnly(filter.value)}
            style={({ pressed }) => ({
              minHeight: 48,
              padding: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: savedOnly === filter.value ? C.blue : C.border,
              backgroundColor: savedOnly === filter.value ? C.pale : C.white,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={s.label}>{filter.title}</Text>
          </Pressable>
        ))}
      </View>
      {searching && (
        <>
          <Section>Matching services</Section>
          <Text accessibilityLiveRegion="polite" style={s.small}>
            {matches.length} {t('found')}
          </Text>
          {matches.map(task => (
            <Row
              navigates
              key={task.id}
              title={task.title}
              detail={officialSources.find(source => source.id === task.department)?.title}
              icon="document-text-outline"
              onPress={() => router.push({ pathname: '/service/task/[id]', params: { id: task.id } })}
            />
          ))}
          {!matches.length && <Body>Try a task such as licence, certificate or training.</Body>}
          <Button secondary label="Clear search" onPress={() => setQuery('')} />
        </>
      )}
      <Section>
        {savedOnly ? 'Your saved departments' : 'Departments'} · {sources.length}
      </Section>
      {sources.map(source => (
        <Row
          navigates
          key={source.id}
          title={source.title}
          detail={`${source.detail}${bookmarks.includes(source.id) ? '\nSaved department' : ''}`}
          icon={source.icon}
          onPress={() => router.push({ pathname: '/service/[id]', params: { id: source.id } })}
        />
      ))}
      {!sources.length && (
        <Card>
          <Icon name="search-outline" size={36} />
          <Section>{savedOnly && !query ? 'No saved departments yet' : 'No matching departments'}</Section>
          <Body>
            {savedOnly && !query
              ? 'Open a department and select Save department to find it here later.'
              : 'Try a department name or clear your search.'}
          </Body>
          <Button
            secondary
            label="Show all departments"
            onPress={() => {
              setQuery('');
              setSavedOnly(false);
            }}
          />
        </Card>
      )}
      <Notice>
        Guides work offline. Applications and form downloads open official websites and need internet.
      </Notice>
      <Section>Explore more</Section>
      <Row
        navigates
        title="Schemes & benefits"
        detail="What to check before applying"
        icon="gift-outline"
        onPress={() => router.push('/schemes')}
      />
      <Row
        navigates
        title="Jan Samvad preparation"
        detail="Keep your discussion notes together"
        icon="calendar-outline"
        onPress={() => router.push('/meetings')}
      />
      <Row
        navigates
        title="Ideas & projects"
        detail="Save a community suggestion"
        icon="bulb-outline"
        onPress={() => router.push('/ideas')}
      />
    </Page>
  );
}
function References({ items }: { items: Reference[] }) {
  return (
    <Card>
      <Section>Official references</Section>
      <Text style={s.small}>Reviewed {reviewedOn} · Public information summary</Text>
      {items.map(item => (
        <View key={item.url} style={{ gap: 4 }}>
          <Text style={s.label}>{item.title}</Text>
          <Text style={s.small}>{item.publisher}</Text>
          <Text selectable style={s.small}>
            {item.url}
          </Text>
        </View>
      ))}
      <Text style={s.small}>These guides are bundled in the app and are not automatically updated.</Text>
    </Card>
  );
}
export function ServiceDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bookmarks, toggleBookmark } = usePlanning();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const source = officialSources.find(s => s.id === id);
  const guide = departmentGuides[id];
  if (!source || !guide)
    return (
      <Page>
        <Title>Department unavailable</Title>
        <Body>This department is not in the app’s catalogue.</Body>
        <Button label="Browse departments" onPress={() => router.dismissTo('/services')} />
      </Page>
    );
  async function toggle() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await toggleBookmark(source!.id);
    } catch {
      setError('The saved department could not be updated. Please try again.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const tasks = serviceTasks.filter(task => task.department === id);
  return (
    <Page>
      <Icon name={source.icon} size={40} />
      <Title>{source.title}</Title>
      <Body>{source.detail}</Body>
      <Body>{guide.overview}</Body>
      <Text style={s.small}>Public information · Reviewed 8 October 2026</Text>
      {tasks.length > 0 && (
        <>
          <Section>What would you like to do?</Section>
          {tasks.map(task => (
            <Row
              navigates
              key={task.id}
              title={task.title}
              detail={task.summary}
              icon="document-text-outline"
              onPress={() => router.push({ pathname: '/service/task/[id]', params: { id: task.id } })}
            />
          ))}
        </>
      )}
      <Card>
        <Section>{id === 'minister' ? 'Listed portfolios' : 'Good to know'}</Section>
        {guide.facts.map(fact => (
          <Body key={fact}>{fact}</Body>
        ))}
      </Card>
      <Button
        secondary
        disabled={busy}
        label={
          busy ? 'Updating…' : bookmarks.includes(source.id) ? 'Remove saved department' : 'Save department'
        }
        icon="bookmark-outline"
        onPress={() => {
          void toggle();
        }}
      />
      {error ? <Notice error>{error}</Notice> : null}
      {id === 'transport' && (
        <Row
          navigates
          title="Prepare a transport problem report"
          detail="Save an issue locally with district and locality"
          icon="create-outline"
          onPress={() => router.push('/report')}
        />
      )}
      {id === 'minister' && (
        <>
          <Row
            navigates
            title="MLA of Roorkee"
            detail="Constituency development and public service"
            icon="location-outline"
            onPress={() => router.push('/roorkee')}
          />
          <Row
            navigates
            title="Ministerial responsibilities"
            detail="Department initiatives and services"
            icon="briefcase-outline"
            onPress={() => router.push('/ministries')}
          />
        </>
      )}
      {id === 'minister' && (
        <Row
          navigates
          title="Prepare for Jan Samvad"
          detail="Save discussion notes; appointment booking is not connected"
          icon="calendar-outline"
          onPress={() => router.push('/meetings')}
        />
      )}
      <References items={guide.references} />
      <Row
        navigates
        title="Need help finding your next step?"
        detail="Ask the offline app guide"
        icon="chatbubbles-outline"
        onPress={() => router.push('/help')}
      />
    </Page>
  );
}
export function ServiceTaskDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [error, setError] = useState('');
  const task = serviceTasks.find(item => item.id === id);
  if (!task)
    return (
      <Page>
        <Title>Guide unavailable</Title>
        <Body>This service guide is not in the app’s catalogue.</Body>
        <Button label="Browse departments" onPress={() => router.dismissTo('/services')} />
      </Page>
    );
  return (
    <Page>
      <Title>{task.title}</Title>
      <Body>{task.summary}</Body>
      <Text style={s.small}>Read offline · Reviewed 8 October 2026</Text>
      <Card>
        <Section>Who this is for</Section>
        <Body>{task.audience}</Body>
      </Card>
      <Card>
        <Section>What to prepare</Section>
        {task.documents.map(document => (
          <Body key={document}>• {document}</Body>
        ))}
      </Card>
      <Section>Step by step</Section>
      {task.steps.map((step, index) => (
        <Card key={step}>
          <Text style={s.badge}>
            Step {index + 1} of {task.steps.length}
          </Text>
          <Body>{step}</Body>
        </Card>
      ))}
      <Notice>{task.note}</Notice>
      {task.transaction && (
        <Card>
          <Section>
            {task.transaction.kind === 'form' ? 'Ready to prepare the application?' : 'Ready to continue?'}
          </Section>
          <Body>
            {task.transaction.kind === 'form'
              ? 'The application PDF opens externally. Submission is by hard copy as described above.'
              : 'The official portal opens externally and needs internet. Complete the transaction there and keep its reference.'}
          </Body>
          <Button
            label={task.transaction.label}
            icon="open-outline"
            onPress={() => {
              setError('');
              void Linking.openURL(task.transaction!.url).catch(() =>
                setError('The official service could not be opened. Check your connection and try again.'),
              );
            }}
          />
          {error ? <Notice error>{error}</Notice> : null}
        </Card>
      )}
      <References items={task.references} />
      <Row
        navigates
        title="Back to department"
        icon="arrow-back-outline"
        onPress={() => router.dismissTo({ pathname: '/service/[id]', params: { id: task.department } })}
      />
    </Page>
  );
}
