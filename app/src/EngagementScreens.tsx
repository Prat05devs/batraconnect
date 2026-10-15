import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from './auth';
import type { Appointment, IdeaStatus, ServerIdea, Slot } from './api-client';
import { Text, useLanguage } from './language';
import { usePlanning } from './planning-store';
import { districts } from './model';
import {
  Badge,
  Chips,
  Empty,
  Gate,
  Loading,
  Picker,
  Toggle,
  useCopy,
  useFormat,
  useResource,
} from './connected-ui';
import { Body, Button, Card, Field, Notice, Page, Row, Section, Title, s } from './ui';

const OFFICE = ['department', 'admin', 'executive'];
const REVIEWERS = ['department', 'admin'];
// ---------------- Ideas ----------------
export function SubmittedIdeas() {
  return <Gate>{() => <IdeasBody />}</Gate>;
}
function IdeasBody() {
  const { session, call } = useAuth();
  const router = useRouter();
  const copy = useCopy();
  const f = useFormat();
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ status?: string; own?: string }>();
  const own = params.own === 'true';
  const office = OFFICE.includes(session!.user.role) && !own;
  const [status, setStatus] = useState(params.status ?? '');
  const [q, setQ] = useState('');
  const list = useResource(
    () =>
      call<{ ideas: ServerIdea[]; total: number }>(
        `/ideas?${new URLSearchParams({ limit: '50', ...(own ? { own: 'true' } : {}), ...(status ? { status } : {}), ...(q.trim() ? { q: q.trim() } : {}) })}`,
      ),
    [call, status, q],
    60000,
  );
  return (
    <Page>
      <Title verbatim>
        {office
          ? copy('Ideas from citizens', 'नागरिकों के सुझाव')
          : copy('Ideas you have sent', 'आपके भेजे सुझाव')}
      </Title>
      <Body verbatim>
        {office
          ? copy(
              'Review suggestions, respond to citizens and record decisions.',
              'सुझावों की समीक्षा करें, नागरिकों को उत्तर दें और निर्णय दर्ज करें।',
            )
          : copy(
              'Follow the office’s response to each idea you shared.',
              'अपने हर सुझाव पर कार्यालय का उत्तर देखें।',
            )}
      </Body>
      {!office && (
        <Button
          label={copy('Share a new idea', 'नया सुझाव दें')}
          icon="bulb-outline"
          onPress={() => router.push('/idea/new')}
        />
      )}
      <Field label={copy('Search ideas', 'सुझाव खोजें')} value={q} onChangeText={setQ} maxLength={100} />
      <Chips
        label={copy('Status', 'स्थिति')}
        value={status}
        onChange={setStatus}
        options={[
          '',
          'Submitted',
          'Under review',
          'Accepted',
          'Implemented',
          'Not taken forward',
          ...(office ? ['Hidden'] : []),
        ].map(v => ({ value: v, label: v ? f.status(v) : copy('All', 'सभी') }))}
      />
      <Loading busy={list.loading && !list.data} error={list.error} onRetry={() => void list.reload()} />
      {list.data?.ideas.map(i => (
        <Row
          verbatim
          key={i.id}
          title={i.title}
          detail={`${f.status(i.status)} · ${t(i.category)} · ${f.district(i.district)}\n${i.reference}${i.citizen ? ` · ${i.citizen}` : ''}`}
          icon="bulb-outline"
          onPress={() => router.push({ pathname: '/submitted-ideas/[id]', params: { id: i.id } })}
        />
      ))}
      {list.data && !list.data.ideas.length && (
        <Empty
          icon="bulb-outline"
          title={copy('No ideas here yet', 'अभी कोई सुझाव नहीं')}
          body={
            office
              ? copy('New suggestions will appear here.', 'नए सुझाव यहाँ दिखेंगे।')
              : copy(
                  'Ideas you send to the office will appear here with their progress.',
                  'कार्यालय को भेजे सुझाव प्रगति सहित यहाँ दिखेंगे।',
                )
          }
        />
      )}
    </Page>
  );
}
export function SubmittedIdeaDetail() {
  return <Gate>{() => <IdeaDetailBody />}</Gate>;
}
function IdeaDetailBody() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, call } = useAuth();
  const copy = useCopy();
  const f = useFormat();
  const { t } = useLanguage();
  const idea = useResource(() => call<{ idea: ServerIdea }>(`/ideas/${id}`).then(r => r.idea), [call, id]);
  const [status, setStatus] = useState<IdeaStatus>('Under review');
  const [note, setNote] = useState('');
  const [visible, setVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const i = idea.data;
  const reviewer = REVIEWERS.includes(session!.user.role) && !i?.mine;
  async function review() {
    if (!i) return;
    setBusy(true);
    setError(null);
    try {
      const r = await call<{ idea: ServerIdea }>(`/ideas/${i.id}/review`, {
        method: 'POST',
        body: {
          status,
          version: i.version,
          note: note.trim(),
          visibleToCitizen: status === 'Hidden' ? false : visible,
        },
      });
      idea.setData(r.idea);
      setNote('');
    } catch (e) {
      setError(e);
      void idea.reload(true);
    } finally {
      setBusy(false);
    }
  }
  if (!i)
    return (
      <Page>
        <Loading busy={idea.loading} error={idea.error} onRetry={() => void idea.reload()} />
      </Page>
    );
  return (
    <Page>
      <Badge value={i.status} />
      <Title verbatim>{i.title}</Title>
      <Text verbatim selectable style={s.small}>
        {i.reference}
        {i.citizen ? ` · ${i.citizen}` : ''}
      </Text>
      <Card>
        <Text verbatim style={s.label}>
          {t(i.category)} · {f.district(i.district)}
        </Text>
        <Body verbatim>{i.description}</Body>
        <Text verbatim style={s.small}>
          {f.date(i.createdAt)}
        </Text>
      </Card>
      <Section verbatim>{copy('Responses and progress', 'उत्तर और प्रगति')}</Section>
      {i.events?.map((e, n) => (
        <Card key={n}>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Badge value={e.status} />
            {!e.visibleToCitizen ? (
              <Text verbatim style={s.small}>
                {copy('Internal note', 'आंतरिक टिप्पणी')}
              </Text>
            ) : null}
          </View>
          <Body verbatim>{e.note}</Body>
          <Text verbatim style={s.small}>
            {e.fromOffice ? copy('Office', 'कार्यालय') : copy('You', 'आप')} · {f.date(e.createdAt)}
          </Text>
        </Card>
      ))}
      {reviewer && (
        <Card>
          <Section verbatim>{copy('Record a decision', 'निर्णय दर्ज करें')}</Section>
          <Picker
            label={copy('New status', 'नई स्थिति')}
            value={status}
            onChange={v => setStatus(v as IdeaStatus)}
            placeholder=""
            options={(
              ['Under review', 'Accepted', 'Implemented', 'Not taken forward', 'Hidden'] as const
            ).map(v => ({
              value: v,
              label:
                v === 'Hidden'
                  ? copy('Hide (abusive or not a suggestion)', 'छिपाएँ (अपमानजनक या सुझाव नहीं)')
                  : f.status(v),
            }))}
          />
          <Field
            label={
              status === 'Hidden'
                ? copy('Reason (kept internal)', 'कारण (आंतरिक)')
                : copy('Response', 'उत्तर')
            }
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={1000}
            editable={!busy}
          />
          {status !== 'Hidden' && (
            <Toggle
              label={copy('Share this response with the citizen', 'यह उत्तर नागरिक को दिखाएँ')}
              value={visible}
              onChange={setVisible}
            />
          )}
          <Button
            disabled={busy || note.trim().length < 5}
            label={busy ? copy('Saving…', 'सहेज रहे हैं…') : copy('Save decision', 'निर्णय सहेजें')}
            onPress={() => void review()}
          />
          {error ? <Notice error>{f.error(error)}</Notice> : null}
        </Card>
      )}
    </Page>
  );
}
/** Sends a locally saved idea to the office; used from the saved-idea screen. */
export function SendIdeaButton({ ideaId }: { ideaId: string }) {
  const { session, call } = useAuth();
  const router = useRouter();
  const copy = useCopy();
  const f = useFormat();
  const planner = usePlanning();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const idea = planner.ideas.find(i => i.id === ideaId);
  if (!idea) return null;
  if (!session)
    return (
      <Button
        secondary
        label={copy(
          'Sign in to send this idea to the office',
          'यह सुझाव कार्यालय को भेजने के लिए लॉगिन करें',
        )}
        onPress={() => router.push('/sign-in')}
      />
    );
  const district =
    districts.find(d => d.name.toLowerCase() === idea.district.trim().toLowerCase())?.name ?? idea.district;
  return (
    <>
      {error ? <Notice error>{f.error(error)}</Notice> : null}
      <Button
        disabled={busy}
        icon="send-outline"
        label={busy ? copy('Sending…', 'भेज रहे हैं…') : copy('Send to the office', 'कार्यालय को भेजें')}
        onPress={() => {
          setBusy(true);
          setError(null);
          void call<{ idea: ServerIdea }>('/ideas', {
            method: 'POST',
            body: { category: idea.category, title: idea.title, description: idea.description, district },
          })
            .then(r => {
              void planner.removeIdea(idea.id).catch(() => {});
              router.replace({ pathname: '/submitted-ideas/[id]', params: { id: r.idea.id } });
            })
            .catch(setError)
            .finally(() => setBusy(false));
        }}
      />
    </>
  );
}
// ---------------- Jan Samvad ----------------
export function Appointments() {
  return <Gate>{() => <AppointmentsBody />}</Gate>;
}
function AppointmentsBody() {
  const { session, call } = useAuth();
  const router = useRouter();
  const copy = useCopy();
  const f = useFormat();
  const params = useLocalSearchParams<{ status?: string; own?: string }>();
  const own = params.own === 'true';
  const office = OFFICE.includes(session!.user.role) && !own;
  const manager = REVIEWERS.includes(session!.user.role) && !own;
  const [status, setStatus] = useState(params.status ?? (office ? 'Requested' : ''));
  const list = useResource(
    () =>
      call<{ appointments: Appointment[] }>(
        `/appointments?${new URLSearchParams({ limit: '100', ...(status ? { status } : {}), ...(office ? { upcoming: 'true' } : { own: 'true' }) })}`,
      ).then(r => r.appointments),
    [call, status, office],
    60000,
  );
  return (
    <Page>
      <Title verbatim>
        {office
          ? copy('Jan Samvad requests', 'जन संवाद अनुरोध')
          : copy('Your Jan Samvad appointments', 'आपकी जन संवाद मुलाकातें')}
      </Title>
      {!office && (
        <>
          <Body verbatim>
            {copy(
              'Book a time to meet the office. You will be notified when it is confirmed, and reminded the day before.',
              'कार्यालय से मिलने का समय बुक करें। पुष्टि होने पर सूचना मिलेगी और एक दिन पहले याद दिलाया जाएगा।',
            )}
          </Body>
          <Button
            icon="calendar-outline"
            label={copy('Book an appointment', 'मुलाकात बुक करें')}
            onPress={() => router.push('/appointments/book')}
          />
          <Row
            verbatim
            title={copy('Prepare your discussion notes', 'चर्चा के नोट तैयार करें')}
            icon="document-text-outline"
            onPress={() => router.push('/meetings')}
          />
        </>
      )}
      {manager && (
        <Button
          icon="time-outline"
          label={copy('Manage available times', 'उपलब्ध समय प्रबंधित करें')}
          onPress={() => router.push('/appointments/slots')}
        />
      )}
      <Chips
        label={copy('Status', 'स्थिति')}
        value={status}
        onChange={setStatus}
        options={['', 'Requested', 'Confirmed', 'Completed', 'Cancelled', 'Declined'].map(v => ({
          value: v,
          label: v ? f.status(v) : copy('All', 'सभी'),
        }))}
      />
      <Loading busy={list.loading && !list.data} error={list.error} onRetry={() => void list.reload()} />
      {list.data?.map(a => (
        <Row
          verbatim
          key={a.id}
          title={a.subject}
          detail={`${f.status(a.status)} · ${a.slot ? f.date(a.slot.startsAt) : ''}\n${a.slot?.location ?? ''}${a.citizen ? ` · ${a.citizen}` : ''}`}
          icon="calendar-outline"
          onPress={() => router.push({ pathname: '/appointments/[id]', params: { id: a.id } })}
        />
      ))}
      {list.data && !list.data.length && (
        <Empty
          icon="calendar-outline"
          title={copy('No appointments', 'कोई मुलाकात नहीं')}
          body={
            office
              ? copy(
                  'Requests that match this filter will appear here.',
                  'इस फ़िल्टर से मिलते अनुरोध यहाँ दिखेंगे।',
                )
              : copy('Your booked appointments will appear here.', 'आपकी बुक की गई मुलाकातें यहाँ दिखेंगी।')
          }
        />
      )}
    </Page>
  );
}
function SlotList({
  district,
  selected,
  onSelect,
  exclude,
}: {
  district: string;
  selected: string;
  onSelect: (id: string) => void;
  exclude?: string;
}) {
  const { call } = useAuth();
  const copy = useCopy();
  const f = useFormat();
  const slots = useResource(
    () =>
      call<{ slots: Slot[] }>(
        `/appointments/slots${district ? `?district=${encodeURIComponent(district)}` : ''}`,
      ).then(r => r.slots.filter(x => x.id !== exclude)),
    [call, district, exclude],
    60000,
  );
  return (
    <>
      <Loading busy={slots.loading && !slots.data} error={slots.error} onRetry={() => void slots.reload()} />
      {slots.data?.map(x => (
        <Row
          verbatim
          key={x.id}
          title={`${f.day(x.startsAt)} · ${f.time(x.startsAt)}–${f.time(x.endsAt)}`}
          detail={`${x.location}\n${x.remaining ? copy(`${x.remaining} places left`, `${x.remaining} स्थान शेष`) : copy('Fully booked', 'पूरी तरह बुक')}`}
          icon="time-outline"
          selected={selected === x.id}
          onPress={() => {
            if (x.remaining) onSelect(x.id);
          }}
        />
      ))}
      {slots.data && !slots.data.length && (
        <Empty
          icon="calendar-outline"
          title={copy('No times available', 'कोई समय उपलब्ध नहीं')}
          body={copy(
            'The office has not published upcoming sessions for this district yet. Please check again later.',
            'कार्यालय ने इस जिले के लिए अभी आगामी सत्र प्रकाशित नहीं किए हैं। बाद में फिर देखें।',
          )}
        />
      )}
    </>
  );
}
export function BookAppointment() {
  return <Gate resident>{() => <BookBody />}</Gate>;
}
function BookBody() {
  const { call } = useAuth();
  const router = useRouter();
  const copy = useCopy();
  const f = useFormat();
  const { language } = useLanguage();
  const { meetings } = usePlanning();
  const [district, setDistrict] = useState('Haridwar');
  const [slot, setSlot] = useState('');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  return (
    <Page>
      <Title verbatim>{copy('Book a Jan Samvad appointment', 'जन संवाद मुलाकात बुक करें')}</Title>
      <Picker
        label={copy('District', 'जिला')}
        value={district}
        onChange={v => {
          setDistrict(v);
          setSlot('');
        }}
        placeholder=""
        icon="location-outline"
        options={districts.map(d => ({ value: d.name, label: language === 'hi' ? d.hi : d.name }))}
      />
      <Section verbatim>{copy('Choose a time', 'समय चुनें')}</Section>
      <SlotList district={district} selected={slot} onSelect={setSlot} />
      <Section verbatim>
        {copy('What would you like to discuss?', 'आप किस विषय पर बात करना चाहते हैं?')}
      </Section>
      {meetings.length > 0 && (
        <Picker
          label={copy('Use saved preparation notes', 'सहेजे गए नोट उपयोग करें')}
          value=""
          onChange={id => {
            const m = meetings.find(x => x.id === id);
            if (m) {
              setSubject(m.subject);
              setNotes(m.notes);
            }
          }}
          placeholder={copy('Choose notes (optional)', 'नोट चुनें (वैकल्पिक)')}
          icon="document-text-outline"
          options={meetings.map(m => ({ value: m.id, label: m.subject }))}
        />
      )}
      <Field
        label={copy('Subject', 'विषय')}
        value={subject}
        onChangeText={setSubject}
        maxLength={100}
        editable={!busy}
      />
      <Field
        label={copy('Discussion points (at least 20 characters)', 'चर्चा के बिंदु (कम से कम 20 अक्षर)')}
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={2000}
        editable={!busy}
      />
      <Notice>
        {copy(
          'Your request is reviewed by the office. It is confirmed only when you receive a confirmation.',
          'आपके अनुरोध की कार्यालय समीक्षा करेगा। पुष्टि मिलने पर ही मुलाकात तय मानी जाएगी।',
        )}
      </Notice>
      {error ? <Notice error>{f.error(error)}</Notice> : null}
      <Button
        disabled={busy || !slot || subject.trim().length < 5 || notes.trim().length < 20}
        label={
          busy
            ? copy('Requesting…', 'अनुरोध भेज रहे हैं…')
            : copy('Request appointment', 'मुलाकात का अनुरोध करें')
        }
        onPress={() => {
          setBusy(true);
          setError(null);
          void call<{ appointment: Appointment }>('/appointments', {
            method: 'POST',
            body: { slotId: slot, subject: subject.trim(), notes: notes.trim() },
          })
            .then(r => router.replace({ pathname: '/appointments/[id]', params: { id: r.appointment.id } }))
            .catch(setError)
            .finally(() => setBusy(false));
        }}
      />
    </Page>
  );
}
export function AppointmentDetail() {
  return <Gate>{() => <AppointmentBody />}</Gate>;
}
function AppointmentBody() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, call } = useAuth();
  const copy = useCopy();
  const f = useFormat();
  const account = session!.user.role;
  const item = useResource(
    () => call<{ appointment: Appointment }>(`/appointments/${id}`).then(r => r.appointment),
    [call, id],
  );
  const [moving, setMoving] = useState(false);
  const [slot, setSlot] = useState('');
  const [note, setNote] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [now] = useState(() => Date.now());
  const a = item.data;
  // The person who booked always gets the resident controls; office decisions are for others' bookings.
  const role = a?.mine ? 'citizen' : account;
  async function post(path: string, body: Record<string, unknown>) {
    if (!a) return;
    setBusy(true);
    setError(null);
    try {
      const r = await call<{ appointment: Appointment }>(`/appointments/${a.id}/${path}`, {
        method: 'POST',
        body: { version: a.version, ...body },
      });
      item.setData(r.appointment);
      setMoving(false);
      setSlot('');
      setNote('');
      setConfirmCancel(false);
    } catch (e) {
      setError(e);
      void item.reload(true);
    } finally {
      setBusy(false);
    }
  }
  if (!a)
    return (
      <Page>
        <Loading busy={item.loading} error={item.error} onRetry={() => void item.reload()} />
      </Page>
    );
  const active = ['Requested', 'Confirmed'].includes(a.status);
  const started = a.slot ? Date.parse(a.slot.startsAt) <= now : false;
  return (
    <Page>
      <Badge value={a.status} />
      <Title verbatim>{a.subject}</Title>
      <Text verbatim selectable style={s.small}>
        {a.reference}
      </Text>
      {a.slot && (
        <Card>
          <Text verbatim style={s.rowTitle}>
            {f.date(a.slot.startsAt)}
          </Text>
          <Text verbatim style={s.small}>
            {copy('Until', 'तक')} {f.time(a.slot.endsAt)} · {a.slot.location}
          </Text>
        </Card>
      )}
      {a.citizen ? (
        <Card>
          <Text verbatim style={s.label}>
            {a.citizen}
          </Text>
          {a.citizenPhone ? (
            <Text verbatim selectable style={s.small}>
              {a.citizenPhone}
            </Text>
          ) : null}
        </Card>
      ) : null}
      <Card>
        <Body verbatim>{a.notes}</Body>
      </Card>
      {a.officeNote ? (
        <Notice>
          {copy('Office note', 'कार्यालय टिप्पणी')}: {a.officeNote}
        </Notice>
      ) : null}
      {a.status === 'Requested' && role === 'citizen' && (
        <Notice>{copy('Waiting for the office to confirm.', 'कार्यालय की पुष्टि की प्रतीक्षा है।')}</Notice>
      )}
      {error ? <Notice error>{f.error(error)}</Notice> : null}
      {role === 'citizen' && active && !started && (
        <>
          {moving ? (
            <Card>
              <Section verbatim>{copy('Choose a new time', 'नया समय चुनें')}</Section>
              <SlotList
                district={a.slot?.district ?? ''}
                selected={slot}
                onSelect={setSlot}
                exclude={a.slotId}
              />
              <Button
                disabled={busy || !slot}
                label={copy('Move appointment', 'मुलाकात का समय बदलें')}
                onPress={() => void post('reschedule', { slotId: slot })}
              />
              <Button
                secondary
                label={copy('Keep current time', 'वर्तमान समय रखें')}
                onPress={() => setMoving(false)}
              />
            </Card>
          ) : (
            <Button secondary label={copy('Reschedule', 'समय बदलें')} onPress={() => setMoving(true)} />
          )}
          {confirmCancel ? (
            <Card>
              <Body verbatim>
                {copy(
                  'Cancel this appointment? The place will be offered to others.',
                  'यह मुलाकात रद्द करें? यह स्थान दूसरों को मिल जाएगा।',
                )}
              </Body>
              <Button
                disabled={busy}
                label={copy('Cancel appointment', 'मुलाकात रद्द करें')}
                onPress={() => void post('cancel', {})}
              />
              <Button
                secondary
                label={copy('Keep appointment', 'मुलाकात रखें')}
                onPress={() => setConfirmCancel(false)}
              />
            </Card>
          ) : (
            <Button
              secondary
              label={copy('Cancel appointment', 'मुलाकात रद्द करें')}
              onPress={() => setConfirmCancel(true)}
            />
          )}
        </>
      )}
      {REVIEWERS.includes(role) && active && (
        <Card>
          <Section verbatim>{copy('Office decision', 'कार्यालय निर्णय')}</Section>
          <Field
            label={copy('Note to the citizen (optional)', 'नागरिक के लिए टिप्पणी (वैकल्पिक)')}
            value={note}
            onChangeText={setNote}
            maxLength={500}
          />
          {a.status === 'Requested' && !started && (
            <Button
              disabled={busy}
              label={copy('Confirm', 'पुष्टि करें')}
              onPress={() =>
                void post('decision', {
                  status: 'Confirmed',
                  ...(note.trim().length >= 3 ? { note: note.trim() } : {}),
                })
              }
            />
          )}
          {!started && (
            <Button
              secondary
              disabled={busy}
              label={copy('Decline', 'अस्वीकार करें')}
              onPress={() =>
                void post('decision', {
                  status: 'Declined',
                  ...(note.trim().length >= 3 ? { note: note.trim() } : {}),
                })
              }
            />
          )}
          {a.status === 'Confirmed' && started && (
            <>
              <Button
                disabled={busy}
                label={copy('Mark completed', 'पूर्ण दर्ज करें')}
                onPress={() => void post('decision', { status: 'Completed' })}
              />
              <Button
                secondary
                disabled={busy}
                label={copy('Mark as missed', 'अनुपस्थित दर्ज करें')}
                onPress={() => void post('decision', { status: 'Missed' })}
              />
            </>
          )}
        </Card>
      )}
    </Page>
  );
}
export function ManageSlots() {
  return <Gate roles={REVIEWERS}>{() => <SlotsBody />}</Gate>;
}
function SlotsBody() {
  const { call } = useAuth();
  const copy = useCopy();
  const f = useFormat();
  const { language } = useLanguage();
  const slots = useResource(() => call<{ slots: Slot[] }>('/appointments/slots').then(r => r.slots), [call]);
  const [district, setDistrict] = useState('Haridwar');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('13:00');
  const [capacity, setCapacity] = useState('20');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [cancelling, setCancelling] = useState('');
  const iso = (time: string) => `${date}T${time}:00+05:30`;
  const valid =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    /^\d{2}:\d{2}$/.test(start) &&
    /^\d{2}:\d{2}$/.test(end) &&
    location.trim().length >= 3 &&
    Number(capacity) >= 1;
  return (
    <Page>
      <Title verbatim>{copy('Available times', 'उपलब्ध समय')}</Title>
      <Body verbatim>
        {copy(
          'Publish Jan Samvad sessions. Citizens can request a place until one hour before each session.',
          'जन संवाद सत्र प्रकाशित करें। नागरिक हर सत्र से एक घंटे पहले तक स्थान का अनुरोध कर सकते हैं।',
        )}
      </Body>
      <Card>
        <Section verbatim>{copy('Add a session', 'सत्र जोड़ें')}</Section>
        <Picker
          label={copy('District', 'जिला')}
          value={district}
          onChange={setDistrict}
          placeholder=""
          options={districts.map(d => ({ value: d.name, label: language === 'hi' ? d.hi : d.name }))}
        />
        <Field
          label={copy('Location', 'स्थान')}
          value={location}
          onChangeText={setLocation}
          maxLength={200}
          placeholder="e.g. Camp office, Civil Lines, Roorkee"
        />
        <Field
          label={copy('Date (YYYY-MM-DD)', 'तिथि (YYYY-MM-DD)')}
          value={date}
          onChangeText={setDate}
          maxLength={10}
        />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field
              label={copy('Starts (24h, IST)', 'प्रारंभ (24 घंटे, IST)')}
              value={start}
              onChangeText={setStart}
              maxLength={5}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field label={copy('Ends', 'समाप्ति')} value={end} onChangeText={setEnd} maxLength={5} />
          </View>
        </View>
        <Field
          label={copy('Places', 'स्थान संख्या')}
          value={capacity}
          onChangeText={v => setCapacity(v.replace(/\D/g, '').slice(0, 3))}
          keyboardType="number-pad"
        />
        {error ? <Notice error>{f.error(error)}</Notice> : null}
        <Button
          disabled={busy || !valid}
          label={
            busy ? copy('Publishing…', 'प्रकाशित कर रहे हैं…') : copy('Publish session', 'सत्र प्रकाशित करें')
          }
          onPress={() => {
            setBusy(true);
            setError(null);
            void call('/appointments/slots', {
              method: 'POST',
              body: {
                district,
                location: location.trim(),
                startsAt: iso(start),
                endsAt: iso(end),
                capacity: Number(capacity),
              },
            })
              .then(() => {
                setLocation('');
                return slots.reload(true);
              })
              .catch(setError)
              .finally(() => setBusy(false));
          }}
        />
      </Card>
      <Section verbatim>{copy('Upcoming sessions', 'आगामी सत्र')}</Section>
      <Loading busy={slots.loading && !slots.data} error={slots.error} />
      {slots.data?.map(x => (
        <Card key={x.id}>
          <Text verbatim style={s.rowTitle}>
            {f.date(x.startsAt)} – {f.time(x.endsAt)}
          </Text>
          <Text verbatim style={s.small}>
            {x.location} · {f.district(x.district)} ·{' '}
            {copy(
              `${x.capacity - (x.remaining ?? 0)} of ${x.capacity} booked`,
              `${x.capacity} में से ${x.capacity - (x.remaining ?? 0)} बुक`,
            )}
          </Text>
          {cancelling === x.id ? (
            <>
              <Notice error>
                {copy(
                  'Cancelling notifies everyone booked in this session.',
                  'रद्द करने पर इस सत्र में बुक सभी को सूचना जाएगी।',
                )}
              </Notice>
              <Button
                disabled={busy}
                label={copy('Cancel session', 'सत्र रद्द करें')}
                onPress={() => {
                  setBusy(true);
                  void call(`/appointments/slots/${x.id}`, { method: 'DELETE' })
                    .then(() => slots.reload(true))
                    .catch(setError)
                    .finally(() => {
                      setBusy(false);
                      setCancelling('');
                    });
                }}
              />
              <Button secondary label={copy('Keep session', 'सत्र रखें')} onPress={() => setCancelling('')} />
            </>
          ) : (
            <Button
              secondary
              label={copy('Cancel session…', 'सत्र रद्द करें…')}
              onPress={() => setCancelling(x.id)}
            />
          )}
        </Card>
      ))}
      {slots.data && !slots.data.length && (
        <Empty
          icon="time-outline"
          title={copy('No upcoming sessions', 'कोई आगामी सत्र नहीं')}
          body={copy('Add a session above so citizens can book.', 'ऊपर सत्र जोड़ें ताकि नागरिक बुक कर सकें।')}
        />
      )}
    </Page>
  );
}
