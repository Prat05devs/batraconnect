import { Text, useLanguage } from './language';
import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePlanning } from './planning-store';
import {
  filterIdeas,
  ideaCategories,
  validateIdea,
  validateMeeting,
  type IdeaDraft,
  type MeetingDraft,
} from './planning';
import { Body, Button, Card, Field, Icon, Notice, Page, Row, Section, Title, s } from './ui';
import { useAuth } from './auth';
import { useCopy } from './connected-ui';
import { SendIdeaButton } from './EngagementScreens';
const timestamp = (date: string, language: 'en' | 'hi') =>
  `${new Date(date).toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN', { timeZone: 'Asia/Kolkata' })} IST`;
export function Ideas() {
  const { t } = useLanguage();
  const router = useRouter();
  const { ideas, ideaDraft } = usePlanning();
  const { session } = useAuth();
  const copy = useCopy();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [filters, setFilters] = useState(false);
  const visible = filterIdeas(ideas, query, category);
  return (
    <Page>
      <Title>Ideas for your community</Title>
      <Body>Turn a suggestion into a clear plan you can return to.</Body>
      {session?.user.role !== 'executive' && (
        <Button
          label={ideaDraft.title || ideaDraft.category ? 'Continue your idea' : 'Write an idea'}
          icon="bulb-outline"
          onPress={() => router.push('/idea/new')}
        />
      )}
      {session ? (
        <Row
          verbatim
          title={copy('Ideas you have sent to the office', 'कार्यालय को भेजे आपके सुझाव')}
          detail={copy('See responses and decisions', 'उत्तर और निर्णय देखें')}
          icon="mail-open-outline"
          onPress={() => router.push({ pathname: '/submitted-ideas', params: { own: 'true' } })}
        />
      ) : (
        <Notice>
          {copy(
            'Ideas below are saved on this device. Sign in to send them to the office and receive a response.',
            'नीचे दिए सुझाव इस डिवाइस पर सहेजे हैं। कार्यालय को भेजने और उत्तर पाने के लिए लॉगिन करें।',
          )}
        </Notice>
      )}
      <Field
        label="Search saved ideas"
        value={query}
        onChangeText={setQuery}
        placeholder="Title, district or description"
        maxLength={100}
      />
      <Button
        secondary
        label={filters ? 'Hide category filters' : `Filter: ${category}`}
        onPress={() => setFilters(!filters)}
      />
      {filters &&
        ['All', ...ideaCategories].map(c => (
          <Row
            key={c}
            title={c}
            icon="funnel-outline"
            selected={category === c}
            onPress={() => {
              setCategory(c);
              setFilters(false);
            }}
          />
        ))}
      <Section>Your saved ideas · {visible.length}</Section>
      {visible.map(i => (
        <Row
          verbatim
          key={i.id}
          title={i.title}
          detail={`${t(i.category)} · ${i.district}\n${t(i.status)}`}
          icon="bulb-outline"
          onPress={() => router.push({ pathname: '/idea/[id]', params: { id: i.id } })}
        />
      ))}
      {visible.length === 0 && (
        <Card>
          <Icon name="bulb-outline" size={36} />
          <Section>{ideas.length ? 'No matching ideas' : 'Make room for a better idea'}</Section>
          <Body>
            {ideas.length
              ? 'Try another search or show all categories.'
              : 'Describe what could improve, who it helps and where it belongs.'}
          </Body>
          {ideas.length > 0 && (
            <Button
              secondary
              label="Reset search and filters"
              onPress={() => {
                setQuery('');
                setCategory('All');
              }}
            />
          )}
        </Card>
      )}
      <Row
        title="Development projects"
        detail="Roorkee development projects and figures"
        icon="construct-outline"
        onPress={() => router.push('/projects')}
      />
    </Page>
  );
}
export function IdeaEditor() {
  const router = useRouter();
  const planner = usePlanning();
  const { session, call } = useAuth();
  const copy = useCopy();
  const [draft, setDraft] = useState<IdeaDraft>(() => ({ ...planner.ideaDraft }));
  const [review, setReview] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  function patch(p: Partial<IdeaDraft>) {
    const next = { ...draft, ...p };
    setDraft(next);
    setFeedback('Saving draft…');
    void planner
      .saveIdeaDraft(next)
      .then(() => setFeedback('Draft saved on this device'))
      .catch(() => setFeedback('Draft not saved. Keep this screen open and retry.'));
  }
  async function save() {
    setSaving(true);
    setError('');
    try {
      const id = await planner.saveIdea(draft);
      router.replace({ pathname: '/idea/[id]', params: { id } });
    } catch {
      setError('Your idea could not be saved. Your details are still here; try again.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <Page>
      <Text style={s.badge}>{review ? '2 OF 2 · REVIEW' : '1 OF 2 · YOUR IDEA'}</Text>
      <Title>{review ? 'Review your idea' : 'What could be better?'}</Title>
      <Body>A useful idea explains the improvement, the people it helps and its location.</Body>
      <Notice>
        {session
          ? copy(
              'Send it to the office for a response, or keep it on this device for later.',
              'उत्तर के लिए कार्यालय को भेजें, या बाद के लिए इस डिवाइस पर रखें।',
            )
          : copy(
              'Save it on this device. Sign in to send it to the office.',
              'इसे इस डिवाइस पर सहेजें। कार्यालय को भेजने के लिए लॉगिन करें।',
            )}
      </Notice>
      {error ? <Notice error>{error}</Notice> : null}
      {review ? (
        <>
          <Card>
            <Section verbatim>{draft.title}</Section>
            <Text style={s.badge}>{draft.category}</Text>
            <Body verbatim>{draft.description}</Body>
            <Text verbatim style={s.label}>
              {draft.district}
            </Text>
          </Card>
          {session && (
            <Button
              disabled={saving}
              icon="send-outline"
              label={
                saving ? copy('Sending…', 'भेज रहे हैं…') : copy('Send to the office', 'कार्यालय को भेजें')
              }
              onPress={() => {
                setSaving(true);
                setError('');
                void call<{ idea: { id: string } }>('/ideas', {
                  method: 'POST',
                  body: {
                    category: draft.category,
                    title: draft.title.trim(),
                    description: draft.description.trim(),
                    district: draft.district.trim(),
                  },
                })
                  .then(r => {
                    void planner
                      .saveIdeaDraft({ category: '', title: '', description: '', district: '' })
                      .catch(() => {});
                    router.replace({ pathname: '/submitted-ideas/[id]', params: { id: r.idea.id } });
                  })
                  .catch((e: Error) => setError(e.message))
                  .finally(() => setSaving(false));
              }}
            />
          )}
          <Button
            secondary={!!session}
            disabled={saving}
            label={saving ? 'Saving…' : 'Save local idea'}
            onPress={() => {
              void save();
            }}
          />
          <Button secondary disabled={saving} label="Edit details" onPress={() => setReview(false)} />
        </>
      ) : (
        <>
          <Section>Area to improve</Section>
          {ideaCategories.map(c => (
            <Row
              key={c}
              title={c}
              icon="bulb-outline"
              selected={draft.category === c}
              onPress={() => patch({ category: c })}
            />
          ))}
          <Field
            label="Idea title"
            value={draft.title}
            maxLength={100}
            onChangeText={title => patch({ title })}
            placeholder="A short name for your suggestion"
          />
          <Field
            label="Describe the idea"
            value={draft.description}
            maxLength={2000}
            multiline
            onChangeText={description => patch({ description })}
            placeholder="What changes, and who benefits?"
          />
          <Field
            label="District"
            value={draft.district}
            maxLength={100}
            onChangeText={district => patch({ district })}
          />
          <Text accessibilityLiveRegion="polite" style={s.small}>
            {feedback || 'Your draft saves automatically on this device.'}
          </Text>
          {feedback.startsWith('Draft not') && (
            <Button secondary label="Retry saving draft" onPress={() => patch({})} />
          )}
          <Button
            label="Review idea"
            onPress={() => {
              const problem = validateIdea(draft);
              setError(problem || '');
              if (!problem) setReview(true);
            }}
          />
        </>
      )}
    </Page>
  );
}
export function Meetings() {
  const { t } = useLanguage();
  const router = useRouter();
  const { meetings, meetingDraft } = usePlanning();
  const { session } = useAuth();
  const copy = useCopy();
  return (
    <Page>
      <Title>Prepare for Jan Samvad</Title>
      <Body>Keep your purpose and discussion points together.</Body>
      {session?.user.role === 'executive' ? null : session ? (
        <Button
          icon="calendar-outline"
          label={copy('Book a Jan Samvad appointment', 'जन संवाद मुलाकात बुक करें')}
          onPress={() => router.push('/appointments/book')}
        />
      ) : (
        <Notice>
          {copy(
            'Sign in to book a Jan Samvad appointment. Preparation notes stay on this device.',
            'जन संवाद मुलाकात बुक करने के लिए लॉगिन करें। तैयारी नोट इस डिवाइस पर रहते हैं।',
          )}
        </Notice>
      )}
      <Button
        label={meetingDraft.subject ? 'Continue preparation' : 'Prepare meeting notes'}
        icon="calendar-outline"
        onPress={() => router.push('/meeting/new')}
      />
      <Section>Before contacting an office</Section>
      <Card>
        <Body>1. Write the issue or idea you want to discuss.</Body>
        <Body>2. Note the district and a nearby landmark.</Body>
        <Body>3. Gather any reference numbers or supporting documents.</Body>
        <Body>4. Confirm the process and availability directly through official sources.</Body>
      </Card>
      <Row
        title="Read department guides"
        detail="Read public information and preparation steps in the app"
        icon="open-outline"
        onPress={() => router.navigate('/services')}
      />
      <Section>Your preparation notes</Section>
      {meetings.length ? (
        meetings.map(m => (
          <Row
            verbatim
            key={m.id}
            title={m.subject}
            detail={`${m.district} · ${t('Preparation only')}`}
            icon="document-text-outline"
            onPress={() => router.push({ pathname: '/meeting/[id]', params: { id: m.id } })}
          />
        ))
      ) : (
        <Card>
          <Section>No meeting notes yet</Section>
          <Body>Prepare once and return to your points when you need them.</Body>
        </Card>
      )}
    </Page>
  );
}
export function MeetingEditor() {
  const router = useRouter();
  const planner = usePlanning();
  const [draft, setDraft] = useState<MeetingDraft>(() => ({ ...planner.meetingDraft }));
  const [review, setReview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  function patch(p: Partial<MeetingDraft>) {
    const next = { ...draft, ...p };
    setDraft(next);
    setFeedback('Saving draft…');
    void planner
      .saveMeetingDraft(next)
      .then(() => setFeedback('Draft saved on this device'))
      .catch(() => setFeedback('Draft not saved. Keep this screen open and retry.'));
  }
  async function save() {
    setSaving(true);
    setError('');
    try {
      const id = await planner.saveMeeting(draft);
      router.replace({ pathname: '/meeting/[id]', params: { id } });
    } catch {
      setError('Your notes could not be saved. Your details are still here; try again.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <Page>
      <Text style={s.badge}>{review ? '2 OF 2 · REVIEW' : '1 OF 2 · PREPARE'}</Text>
      <Title>{review ? 'Review your notes' : 'What would you like to discuss?'}</Title>
      <Notice>
        These notes stay on this device. Saving them does not request or confirm an appointment.
      </Notice>
      {error ? <Notice error>{error}</Notice> : null}
      {review ? (
        <>
          <Card>
            <Section verbatim>{draft.subject}</Section>
            <Body verbatim>{draft.notes}</Body>
            <Text verbatim style={s.label}>
              {draft.district}
            </Text>
          </Card>
          <Button
            disabled={saving}
            label={saving ? 'Saving…' : 'Save preparation notes'}
            onPress={() => {
              void save();
            }}
          />
          <Button secondary disabled={saving} label="Edit notes" onPress={() => setReview(false)} />
        </>
      ) : (
        <>
          <Field
            label="Meeting subject"
            value={draft.subject}
            maxLength={100}
            onChangeText={subject => patch({ subject })}
          />
          <Field
            label="Discussion points"
            value={draft.notes}
            multiline
            maxLength={2000}
            onChangeText={notes => patch({ notes })}
            placeholder="What do you want to explain or ask?"
          />
          <Field
            label="District"
            value={draft.district}
            maxLength={100}
            onChangeText={district => patch({ district })}
          />
          <Text accessibilityLiveRegion="polite" style={s.small}>
            {feedback || 'Your draft saves automatically on this device.'}
          </Text>
          {feedback.startsWith('Draft not') && (
            <Button secondary label="Retry saving draft" onPress={() => patch({})} />
          )}
          <Button
            label="Review preparation"
            onPress={() => {
              const problem = validateMeeting(draft);
              setError(problem || '');
              if (!problem) setReview(true);
            }}
          />
        </>
      )}
    </Page>
  );
}
export function PlanningDetail({ kind }: { kind: 'idea' | 'meeting' }) {
  const { language } = useLanguage();
  const router = useRouter();
  const copy = useCopy();
  const { id } = useLocalSearchParams<{ id: string }>();
  const planner = usePlanning();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const idea = kind === 'idea';
  const item = idea ? planner.ideas.find(i => i.id === id) : planner.meetings.find(m => m.id === id);
  const destination = idea ? '/ideas' : '/meetings';
  if (!item)
    return (
      <Page>
        <Title>{idea ? 'Idea unavailable' : 'Notes unavailable'}</Title>
        <Body>This item may have been removed from this device.</Body>
        <Button
          label={idea ? 'Back to ideas' : 'Back to preparation'}
          onPress={() => router.dismissTo(destination)}
        />
      </Page>
    );
  async function remove() {
    setBusy(true);
    try {
      if (idea) await planner.removeIdea(id);
      else await planner.removeMeeting(id);
      router.dismissTo(destination);
    } catch {
      setError('The item could not be removed. Try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page>
      <Text style={s.badge}>{item.status}</Text>
      <Title verbatim>{'title' in item ? item.title : item.subject}</Title>
      <Text selectable style={s.small}>
        {item.id}
      </Text>
      <Card>
        {'category' in item && <Text style={s.label}>{item.category}</Text>}
        <Body verbatim>{'description' in item ? item.description : item.notes}</Body>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Icon name="location-outline" />
          <Text verbatim style={[s.body, { flex: 1 }]}>
            {item.district}
          </Text>
        </View>
      </Card>
      <Notice>
        {idea
          ? 'Saved on this device. No department has received this idea.'
          : 'Preparation saved. You do not have a booked appointment.'}
      </Notice>
      {idea ? (
        <SendIdeaButton ideaId={item.id} />
      ) : (
        <Button
          icon="calendar-outline"
          label={copy('Book an appointment with these notes', 'इन नोट के साथ मुलाकात बुक करें')}
          onPress={() => router.push('/appointments/book')}
        />
      )}
      <Text style={s.small}>Saved {timestamp(item.createdAt, language)}</Text>
      <Button
        label={idea ? 'Back to ideas' : 'Back to preparation'}
        onPress={() => router.dismissTo(destination)}
      />
      {error ? <Notice error>{error}</Notice> : null}
      {confirm ? (
        <Card>
          <Section>Remove this local item?</Section>
          <Body>This removes only this saved {idea ? 'idea' : 'note'} from the device.</Body>
          <Button
            disabled={busy}
            label={busy ? 'Removing…' : 'Remove item'}
            onPress={() => {
              void remove();
            }}
          />
          <Button secondary disabled={busy} label="Keep item" onPress={() => setConfirm(false)} />
        </Card>
      ) : (
        <Button
          secondary
          label={idea ? 'Remove local idea' : 'Remove preparation notes'}
          onPress={() => setConfirm(true)}
        />
      )}
    </Page>
  );
}
