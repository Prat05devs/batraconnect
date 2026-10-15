import React, { useEffect, useState } from 'react';
import { Image, Linking, Platform, View } from 'react-native';
import { Pressable } from '@/components/pressable';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAuth, API_BASE } from './auth';
import type { Insights, Notification, StaffMember, SubmittedComplaint } from './api-client';
import { Text, useLanguage } from './language';
import { actionLabel } from './labels';
import { routeForLink } from './push';
import { useReferenceData } from './reference-data';
import {
  Badge,
  Bar,
  Chips,
  Empty,
  Gate,
  Loading,
  Picker,
  Stat,
  Stats,
  Toggle,
  useCopy,
  useFormat,
  useResource,
} from './connected-ui';
import { Body, Button, C, Card, Field, FitImage, Notice, Page, Row, Section, Title, s } from './ui';
import { WorkflowGuide } from './OfficeScreens';
export { SignIn, AccountCard } from './AccountScreens';

/** Loads private report photos with the session token (web cannot send headers on <img>). */
function AuthImage({ id, label, size = 240 }: { id: string; label: string; size?: number }) {
  const { session } = useAuth();
  const [uri, setUri] = useState<string | null>(null);
  const url = `${API_BASE}/api/v1/media/${id}`;
  useEffect(() => {
    if (Platform.OS !== 'web' || !session) return;
    let revoked: string | null = null;
    let active = true;
    void fetch(url, { headers: { Authorization: `Bearer ${session.token}` } })
      .then(r => (r.ok ? r.blob() : null))
      .then(blob => {
        if (blob && active) {
          revoked = URL.createObjectURL(blob);
          setUri(revoked);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [session, url]);
  if (!session) return null;
  const source =
    Platform.OS === 'web'
      ? uri
        ? { uri }
        : null
      : { uri: url, headers: { Authorization: `Bearer ${session.token}` } };
  return source ? (
    <FitImage source={source} label={label} maxHeight={size * 2} />
  ) : (
    <View style={{ height: size, borderRadius: 16, backgroundColor: C.pale }} />
  );
}
const STATUSES = ['', 'Submitted', 'Assigned', 'In progress', 'Resolved', 'Reopened', 'Closed'] as const;
export function SubmittedReports() {
  return <Gate>{() => <ReportsBody />}</Gate>;
}
function ReportsBody() {
  const { session, call } = useAuth();
  const router = useRouter();
  const copy = useCopy();
  const f = useFormat();
  const { language } = useLanguage();
  const params = useLocalSearchParams<{
    overdue?: string;
    escalated?: string;
    mine?: string;
    status?: string;
    own?: string;
  }>();
  // own=true: a staff member viewing the reports they sent as a resident, in the resident layout.
  const own = params.own === 'true';
  const role = session!.user.role;
  const staff = role !== 'citizen' && !own;
  const reference = useReferenceData();
  const [status, setStatus] = useState<string>(params.status ?? '');
  const [overdue, setOverdue] = useState(params.overdue === 'true');
  const [escalated, setEscalated] = useState(params.escalated === 'true');
  const [mine, setMine] = useState(params.mine === 'true');
  const [sort, setSort] = useState<'newest' | 'due' | 'oldest'>(staff ? 'due' : 'newest');
  const [category, setCategory] = useState('');
  const [ward, setWard] = useState('');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState(false);
  const [more, setMore] = useState<SubmittedComplaint[]>([]);
  useEffect(() => {
    const timer = setTimeout(() => setQ(text.trim()), 400);
    return () => clearTimeout(timer);
  }, [text]);
  const query = new URLSearchParams({
    limit: '30',
    sort,
    ...(status ? { status } : {}),
    ...(q ? { q } : {}),
    ...(category ? { category } : {}),
    ...(ward ? { wardId: ward } : {}),
    ...(overdue ? { overdue: 'true' } : {}),
    ...(escalated ? { escalated: 'true' } : {}),
    ...(mine ? { mine: 'true' } : {}),
    ...(own ? { own: 'true' } : {}),
  }).toString();
  const page = useResource(
    async () => {
      const data = await call<{ complaints: SubmittedComplaint[]; total: number }>(`/complaints?${query}`);
      setMore([]);
      return data;
    },
    [call, query],
    30000,
  );
  const reports = [...(page.data?.complaints ?? []), ...more];
  const total = page.data?.total ?? 0;
  const [loadingMore, setLoadingMore] = useState(false);
  async function loadMore() {
    setLoadingMore(true);
    try {
      const data = await call<{ complaints: SubmittedComplaint[] }>(
        `/complaints?${query}&offset=${reports.length}`,
      );
      setMore(old => [...old, ...data.complaints]);
    } catch {
      /* the list keeps what it has */
    } finally {
      setLoadingMore(false);
    }
  }
  const filterCount = [category, ward, overdue, escalated, mine].filter(Boolean).length;
  return (
    <Page>
      <Title verbatim>
        {staff
          ? copy('Report queue', 'रिपोर्ट कतार')
          : own
            ? copy('Reports you sent', 'आपकी भेजी रिपोर्ट')
            : copy('Your submitted reports', 'आपकी भेजी गई रिपोर्ट')}
      </Title>
      <Body verbatim>
        {staff
          ? copy(
              'Reports within your authorised scope. The list refreshes automatically.',
              'आपके अधिकृत क्षेत्र की रिपोर्ट। सूची अपने आप रीफ्रेश होती है।',
            )
          : copy(
              'Reports received by Batra Connect. Office actions appear in each report’s activity.',
              'बत्रा कनेक्ट को प्राप्त रिपोर्ट। कार्यालय की कार्रवाई हर रिपोर्ट की गतिविधि में दिखती है।',
            )}
      </Body>
      {staff &&
        (() => {
          const focus = overdue
            ? copy(
                'Showing reports past their deadline. Act on these first.',
                'समय-सीमा पार रिपोर्ट दिख रही हैं। इन पर पहले कार्रवाई करें।',
              )
            : escalated
              ? copy(
                  'Showing escalated reports. Senior officials have been alerted.',
                  'एस्केलेटेड रिपोर्ट दिख रही हैं। वरिष्ठ अधिकारियों को सूचना दी गई है।',
                )
              : status === 'Submitted'
                ? copy(
                    'Showing reports waiting to be assigned. Open one to choose a field officer.',
                    'सौंपे जाने की प्रतीक्षा वाली रिपोर्ट दिख रही हैं। फील्ड अधिकारी चुनने के लिए एक खोलें।',
                  )
                : status === 'Reopened'
                  ? copy(
                      'Showing reports the citizen says are not fixed. Open one to restart or reassign.',
                      'वे रिपोर्ट दिख रही हैं जिन्हें नागरिक ने ठीक नहीं बताया। फिर शुरू करने या सौंपने के लिए खोलें।',
                    )
                  : status === 'In progress'
                    ? copy(
                        'Showing work in progress. Open one to add the completion photo and resolve it.',
                        'जारी कार्य दिख रहे हैं। पूरा होने की फोटो जोड़कर समाधान दर्ज करने के लिए खोलें।',
                      )
                    : null;
          return focus ? (
            <Card>
              <Text verbatim style={[s.body, { color: C.navy }]}>
                {focus}
              </Text>
              <Button
                secondary
                label={copy('Show all reports', 'सभी रिपोर्ट दिखाएँ')}
                onPress={() => {
                  setStatus('');
                  setOverdue(false);
                  setEscalated(false);
                }}
              />
            </Card>
          ) : null;
        })()}
      <Field
        label={copy(
          'Search title, reference, locality or description',
          'शीर्षक, संदर्भ, स्थान या विवरण खोजें',
        )}
        value={text}
        onChangeText={setText}
        maxLength={100}
        autoCapitalize="none"
      />
      <Chips
        label={copy('Status', 'स्थिति')}
        value={status}
        onChange={setStatus}
        options={STATUSES.map(v => ({ value: v, label: v ? f.status(v) : copy('All', 'सभी') }))}
      />
      <Chips
        label={copy('Order', 'क्रम')}
        value={sort}
        onChange={setSort}
        options={[
          { value: 'newest', label: copy('Newest', 'नवीनतम') },
          { value: 'due', label: copy('Due soonest', 'सबसे पहले देय') },
          { value: 'oldest', label: copy('Oldest', 'सबसे पुरानी') },
        ]}
      />
      <Button
        secondary
        label={
          filters
            ? copy('Hide filters', 'फ़िल्टर छिपाएँ')
            : `${copy('More filters', 'और फ़िल्टर')}${filterCount ? ` (${filterCount})` : ''}`
        }
        onPress={() => setFilters(!filters)}
      />
      {filters && (
        <Card>
          <Picker
            label={copy('Category', 'श्रेणी')}
            value={category}
            onChange={setCategory}
            placeholder={copy('All categories', 'सभी श्रेणियाँ')}
            options={[
              { value: '', label: copy('All categories', 'सभी श्रेणियाँ') },
              ...reference.categories.map(c => ({
                value: c.name,
                label: language === 'hi' ? c.hindiName : c.name,
              })),
            ]}
          />
          <Picker
            label={copy('Roorkee ward', 'रुड़की वार्ड')}
            value={ward}
            onChange={setWard}
            placeholder={copy('All wards', 'सभी वार्ड')}
            icon="map-outline"
            options={[
              { value: '', label: copy('All wards', 'सभी वार्ड') },
              ...reference.wards.map(w => ({
                value: w.id,
                label: language === 'hi' && w.hindiName ? w.hindiName : w.name,
              })),
            ]}
          />
          <Toggle
            label={copy('Past deadline only', 'केवल समय-सीमा पार')}
            value={overdue}
            onChange={setOverdue}
          />
          {staff && (
            <Toggle
              label={copy('Escalated only', 'केवल एस्केलेटेड')}
              value={escalated}
              onChange={setEscalated}
            />
          )}
          {['department', 'admin'].includes(role) && (
            <Toggle label={copy('Assigned to me', 'मुझे सौंपी गई')} value={mine} onChange={setMine} />
          )}
          <Button
            secondary
            label={copy('Clear filters', 'फ़िल्टर हटाएँ')}
            onPress={() => {
              setCategory('');
              setWard('');
              setOverdue(false);
              setEscalated(false);
              setMine(false);
              setStatus('');
              setText('');
            }}
          />
        </Card>
      )}
      <Loading busy={page.loading && !page.data} error={page.error} onRetry={() => void page.reload()} />
      <Text verbatim accessibilityLiveRegion="polite" style={s.label}>
        {copy(`${reports.length} of ${total} reports`, `${total} में से ${reports.length} रिपोर्ट`)}
      </Text>
      {reports.map(r => (
        <Pressable
          key={r.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/submitted/[id]', params: { id: r.id } })}
          style={({ pressed }) => [s.card, { opacity: pressed ? 0.7 : 1, gap: 8 }]}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Badge value={r.status} />
            {r.overdue ? <Badge value="overdue" label={copy('Past deadline', 'समय-सीमा पार')} /> : null}
            {(r.escalationLevel ?? 0) > 0 && r.overdue ? (
              <Badge
                value="escalated"
                label={copy(`Escalated ${r.escalationLevel}`, `एस्केलेट ${r.escalationLevel}`)}
              />
            ) : null}
          </View>
          <Text verbatim style={s.rowTitle}>
            {r.title}
          </Text>
          <Text verbatim style={s.small}>
            {r.reference} · {f.district(r.district)} · {r.locality}
          </Text>
          {r.dueAt && !['Resolved', 'Closed'].includes(r.status) ? (
            <Text verbatim style={[s.small, r.overdue && { color: C.red }]}>
              {copy('Due', 'देय')}: {f.date(r.dueAt)}
            </Text>
          ) : null}
        </Pressable>
      ))}
      {!page.loading && !page.error && !reports.length && (
        <Empty
          icon="file-tray-outline"
          title={copy('No reports found', 'कोई रिपोर्ट नहीं मिली')}
          body={
            staff
              ? copy('Nothing matches these filters.', 'इन फ़िल्टर से कुछ नहीं मिला।')
              : copy(
                  'Reports you send will appear here with their progress.',
                  'आपकी भेजी रिपोर्ट प्रगति सहित यहाँ दिखेंगी।',
                )
          }
        />
      )}
      {reports.length < total && (
        <Button
          secondary
          disabled={loadingMore}
          label={loadingMore ? copy('Loading…', 'लोड हो रहा है…') : copy('Load more', 'और लोड करें')}
          onPress={() => void loadMore()}
        />
      )}
      {!staff && (
        <Button label={copy('Report a problem', 'समस्या बताएँ')} onPress={() => router.push('/report')} />
      )}
    </Page>
  );
}
export function SubmittedDetail() {
  return <Gate>{() => <DetailBody />}</Gate>;
}
function DetailBody() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, call } = useAuth();
  const copy = useCopy();
  const f = useFormat();
  const { language } = useLanguage();
  const router = useRouter();
  const account = session!.user.role;
  const report = useResource(
    () => call<{ complaint: SubmittedComplaint }>(`/complaints/${id}`).then(r => r.complaint),
    [call, id],
    45000,
  );
  const canAssign = ['department', 'admin'].includes(account);
  const staff = useResource(
    () =>
      canAssign
        ? call<{ staff: StaffMember[] }>(`/staff?complaintId=${id}`).then(r => r.staff)
        : Promise.resolve([] as StaffMember[]),
    [call, id, canAssign],
  );
  const [note, setNote] = useState('');
  const [assignee, setAssignee] = useState('');
  const [photos, setPhotos] = useState<{ id: string; uri: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const r = report.data;
  async function act(path: 'assign' | 'status', body: Record<string, unknown>) {
    if (!r || busy) return;
    setBusy(true);
    setError(null);
    try {
      const data = await call<{ complaint: SubmittedComplaint }>(`/complaints/${r.id}/${path}`, {
        method: 'POST',
        body: { version: r.version, note: note.trim(), ...body },
      });
      report.setData(data.complaint);
      setNote('');
      setAssignee('');
      setPhotos([]);
      void staff.reload(true);
    } catch (e) {
      setError(e);
      void report.reload(true);
    } finally {
      setBusy(false);
    }
  }
  async function addPhoto(camera: boolean) {
    setError(null);
    try {
      if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) {
        setError(new Error(copy('Camera access was not granted.', 'कैमरा अनुमति नहीं मिली।')));
        return;
      }
      const picked = camera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
      if (picked.canceled) return;
      setBusy(true);
      const uri = picked.assets[0].uri;
      const form = new FormData();
      if (Platform.OS === 'web') form.append('photo', await fetch(uri).then(x => x.blob()), 'closure.jpg');
      else form.append('photo', { uri, name: 'closure.jpg', type: 'image/jpeg' } as unknown as Blob);
      const media = (await call<{ media: { id: string } }>('/media', { method: 'POST', body: form })).media;
      setPhotos(old => [...old, { id: media.id, uri }]);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  if (!r)
    return (
      <Page>
        <Loading busy={report.loading} error={report.error} onRetry={() => void report.reload()} />
      </Page>
    );
  // The person who sent a report always gets the resident view of it, even if they are staff.
  const role = r.mine ? ('citizen' as const) : account;
  const open = !['Resolved', 'Closed'].includes(r.status);
  const canWork = !r.mine && ['field', 'department', 'admin'].includes(account);
  const assignable =
    canAssign && !r.mine && ['Submitted', 'Assigned', 'Reopened', 'In progress'].includes(r.status);
  const showActions =
    assignable ||
    (canWork && ['Assigned', 'Reopened', 'In progress'].includes(r.status)) ||
    (role === 'citizen' && r.status === 'Resolved');
  const isMine = r.assignedTo === session!.user.id;
  const minimum = assignable && r.status === 'Submitted' ? 5 : 10;
  const need = Math.max(0, minimum - note.trim().length);
  const evidence = r.media?.filter(m => m.purpose !== 'resolution') ?? [],
    closure = r.media?.filter(m => m.purpose === 'resolution') ?? [];
  return (
    <Page>
      {report.error ? <Notice error>{f.error(report.error)}</Notice> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Badge value={r.status} />
        {r.overdue ? <Badge value="overdue" label={copy('Past deadline', 'समय-सीमा पार')} /> : null}
        {(r.escalationLevel ?? 0) > 0 && open ? (
          <Badge
            value="escalated"
            label={copy(`Escalation level ${r.escalationLevel}`, `एस्केलेशन स्तर ${r.escalationLevel}`)}
          />
        ) : null}
      </View>
      <Title verbatim>{r.title}</Title>
      <Text verbatim selectable style={s.small}>
        {r.reference}
      </Text>
      <WorkflowGuide report={r} role={role} isAssignee={r.assignedTo === session!.user.id} />
      {showActions && (
        <Card>
          <Section verbatim>{copy('Take action', 'कार्रवाई करें')}</Section>
          {assignable && (
            <>
              <Text verbatim style={s.label}>
                {r.assignee ? copy('Reassign to', 'फिर सौंपें') : copy('Assign to', 'सौंपें')}
              </Text>
              <Loading busy={staff.loading && !staff.data} error={staff.error} />
              {staff.data?.map(p => (
                <Row
                  verbatim
                  key={p.id}
                  title={p.name}
                  detail={copy(
                    `${p.openAssignments} open · ${p.overdueAssignments} past deadline`,
                    `${p.openAssignments} खुली · ${p.overdueAssignments} समय-सीमा पार`,
                  )}
                  icon="person-outline"
                  selected={assignee === p.id}
                  onPress={() => setAssignee(p.id)}
                />
              ))}
              {staff.data && !staff.data.length && (
                <Body verbatim>
                  {copy(
                    'No active field officer covers this district and category. Ask an administrator to add one.',
                    'इस जिले और श्रेणी के लिए कोई सक्रिय फील्ड अधिकारी नहीं है। प्रशासक से जोड़ने को कहें।',
                  )}
                </Body>
              )}
              {role !== 'citizen' &&
              canWork &&
              r.latitude != null &&
              r.longitude != null &&
              (isMine || !assignable) ? (
                <Button
                  secondary
                  icon="navigate-outline"
                  label={copy('Open location in maps', 'स्थान मानचित्र में खोलें')}
                  onPress={() =>
                    void Linking.openURL(
                      `https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`,
                    )
                  }
                />
              ) : null}
              <Field
                label={
                  role === 'citizen'
                    ? copy('Your response', 'आपका उत्तर')
                    : assignable && !['Assigned', 'Reopened', 'In progress'].includes(r.status)
                      ? copy('Instructions for the field officer', 'फील्ड अधिकारी के लिए निर्देश')
                      : copy('Note for the record', 'रिकॉर्ड के लिए टिप्पणी')
                }
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={1000}
                editable={!busy}
                placeholder={
                  role === 'field'
                    ? copy(
                        'e.g. Reached the site; replacing the damaged valve',
                        'जैसे: स्थान पर पहुँचे; खराब वाल्व बदल रहे हैं',
                      )
                    : undefined
                }
              />
              {need > 0 ? (
                <Text verbatim style={s.small}>
                  {copy(
                    `Add ${need} more character${need === 1 ? '' : 's'} to continue.`,
                    `आगे बढ़ने के लिए ${need} अक्षर और लिखें।`,
                  )}
                </Text>
              ) : null}
              <Button
                disabled={busy || !assignee || assignee === r.assignedTo || note.trim().length < 5}
                label={
                  r.assignee
                    ? copy('Reassign report', 'रिपोर्ट फिर सौंपें')
                    : copy('Assign report', 'रिपोर्ट सौंपें')
                }
                onPress={() => void act('assign', { assigneeId: assignee })}
              />
            </>
          )}
          {!assignable && (
            <>
              {' '}
              {role !== 'citizen' &&
              canWork &&
              r.latitude != null &&
              r.longitude != null &&
              (isMine || !assignable) ? (
                <Button
                  secondary
                  icon="navigate-outline"
                  label={copy('Open location in maps', 'स्थान मानचित्र में खोलें')}
                  onPress={() =>
                    void Linking.openURL(
                      `https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`,
                    )
                  }
                />
              ) : null}
              <Field
                label={
                  role === 'citizen'
                    ? copy('Your response', 'आपका उत्तर')
                    : assignable && !['Assigned', 'Reopened', 'In progress'].includes(r.status)
                      ? copy('Instructions for the field officer', 'फील्ड अधिकारी के लिए निर्देश')
                      : copy('Note for the record', 'रिकॉर्ड के लिए टिप्पणी')
                }
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={1000}
                editable={!busy}
                placeholder={
                  role === 'field'
                    ? copy(
                        'e.g. Reached the site; replacing the damaged valve',
                        'जैसे: स्थान पर पहुँचे; खराब वाल्व बदल रहे हैं',
                      )
                    : undefined
                }
              />
              {need > 0 ? (
                <Text verbatim style={s.small}>
                  {copy(
                    `Add ${need} more character${need === 1 ? '' : 's'} to continue.`,
                    `आगे बढ़ने के लिए ${need} अक्षर और लिखें।`,
                  )}
                </Text>
              ) : null}
            </>
          )}
          {canWork && ['Assigned', 'Reopened'].includes(r.status) && (
            <Button
              disabled={busy || note.trim().length < 10}
              label={copy('Start work', 'कार्य शुरू करें')}
              onPress={() => void act('status', { status: 'In progress' })}
            />
          )}
          {canWork && r.status === 'In progress' && (
            <>
              <Text verbatim style={s.label}>
                {copy(
                  'Photos of the completed work (required, up to 3)',
                  'पूरे कार्य की फोटो (आवश्यक, अधिकतम 3)',
                )}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {photos.map((p, i) => (
                  <View key={p.id} style={{ gap: 4 }}>
                    <Image
                      source={{ uri: p.uri }}
                      accessibilityLabel={copy(`Closure photo ${i + 1}`, `समापन फोटो ${i + 1}`)}
                      style={{ width: 112, height: 112, borderRadius: 12 }}
                    />
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setPhotos(old => old.filter(x => x.id !== p.id))}
                      style={{ minHeight: 44, justifyContent: 'center' }}
                    >
                      <Text verbatim style={{ color: C.red }}>
                        {copy('Remove', 'हटाएँ')}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
              {photos.length < 3 && (
                <>
                  <Button
                    secondary
                    disabled={busy}
                    icon="camera-outline"
                    label={copy('Take a photo', 'फोटो लें')}
                    onPress={() => void addPhoto(true)}
                  />
                  <Button
                    secondary
                    disabled={busy}
                    icon="images-outline"
                    label={copy('Choose a photo', 'फोटो चुनें')}
                    onPress={() => void addPhoto(false)}
                  />
                </>
              )}
              <Button
                disabled={busy || note.trim().length < 10 || !photos.length}
                label={copy('Mark resolved', 'समाधान दर्ज करें')}
                onPress={() => void act('status', { status: 'Resolved', mediaIds: photos.map(p => p.id) })}
              />
            </>
          )}
          {role === 'citizen' && r.status === 'Resolved' && (
            <>
              <Button
                disabled={busy || note.trim().length < 10}
                label={copy('Accept resolution', 'समाधान स्वीकार करें')}
                onPress={() => void act('status', { status: 'Closed' })}
              />
              <Button
                secondary
                disabled={busy || note.trim().length < 10}
                label={copy(
                  'Not fixed — request another review',
                  'ठीक नहीं हुआ — फिर समीक्षा का अनुरोध करें',
                )}
                onPress={() => void act('status', { status: 'Reopened' })}
              />
            </>
          )}
          {error ? <Notice error>{f.error(error)}</Notice> : null}
        </Card>
      )}
      {showActions ? <Section verbatim>{copy('Report details', 'रिपोर्ट विवरण')}</Section> : null}
      <Card>
        <Body verbatim>{r.description}</Body>
        <Text verbatim style={s.small}>
          {r.category} · {f.district(r.district)}
          {r.ward ? ` · ${language === 'hi' && r.ward.hindiName ? r.ward.hindiName : r.ward.name}` : ''}
          {'\n'}
          {r.locality}
        </Text>
        {r.latitude != null && r.longitude != null && (
          <Button
            secondary
            icon="map-outline"
            label={copy('Open location in maps', 'स्थान मानचित्र में खोलें')}
            onPress={() =>
              void Linking.openURL(
                `https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`,
              )
            }
          />
        )}
      </Card>
      <Card>
        <Text verbatim style={s.label}>
          {copy('Received', 'प्राप्त')}: {f.date(r.createdAt)}
        </Text>
        {r.dueAt ? (
          <Text verbatim style={[s.small, r.overdue && { color: C.red }]}>
            {open ? copy('Service deadline', 'सेवा समय-सीमा') : copy('Deadline was', 'समय-सीमा थी')}:{' '}
            {f.date(r.dueAt)}
          </Text>
        ) : null}
        {r.resolvedAt ? (
          <Text verbatim style={s.small}>
            {copy('Resolved', 'समाधान')}: {f.date(r.resolvedAt)}
          </Text>
        ) : null}
        {r.assignee ? (
          <Text verbatim style={s.small}>
            {copy('Field officer', 'फील्ड अधिकारी')}: {r.assignee.name}
          </Text>
        ) : null}
      </Card>
      {r.office && (
        <Card>
          <Text verbatim style={s.label}>
            {copy('Responsible office', 'ज़िम्मेदार कार्यालय')}
          </Text>
          <Text verbatim style={s.rowTitle}>
            {language === 'hi' && r.office.hindiName ? r.office.hindiName : r.office.name}
          </Text>
          {r.office.address ? (
            <Text verbatim style={s.small}>
              {r.office.address}
            </Text>
          ) : null}
          {r.office.hours ? (
            <Text verbatim style={s.small}>
              {r.office.hours}
            </Text>
          ) : null}
          {r.office.phone ? (
            <Button
              secondary
              icon="call-outline"
              label={r.office.phone}
              onPress={() => void Linking.openURL(`tel:${r.office!.phone}`)}
            />
          ) : null}
        </Card>
      )}
      {evidence.length > 0 && (
        <>
          <Section verbatim>{copy('Photos from the report', 'रिपोर्ट की फोटो')}</Section>
          {evidence.map((m, i) => (
            <AuthImage key={m.id} id={m.id} label={copy(`Report photo ${i + 1}`, `रिपोर्ट फोटो ${i + 1}`)} />
          ))}
        </>
      )}
      {r.resolution ? (
        <Card>
          <Text verbatim style={s.label}>
            {copy('Resolution', 'समाधान')}
          </Text>
          <Body verbatim>{r.resolution}</Body>
        </Card>
      ) : null}
      {closure.length > 0 && (
        <>
          <Section verbatim>{copy('Completed work', 'पूरा हुआ कार्य')}</Section>
          {closure.map((m, i) => (
            <AuthImage
              key={m.id}
              id={m.id}
              label={copy(`Completed work photo ${i + 1}`, `पूरे कार्य की फोटो ${i + 1}`)}
            />
          ))}
        </>
      )}
      <Section verbatim>{copy('Activity', 'गतिविधि')}</Section>
      {r.events?.map((e, i) => (
        <Card key={`${e.createdAt}-${i}`}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge
              value={e.action === 'escalated' ? 'escalated' : e.status}
              label={e.action === 'escalated' ? actionLabel(e.action, language) : f.status(e.status)}
            />
            {e.actor ? (
              <Text verbatim style={s.small}>
                {e.actor}
              </Text>
            ) : null}
          </View>
          <Body verbatim>{e.note}</Body>
          <Text verbatim style={s.small}>
            {f.date(e.createdAt)}
          </Text>
        </Card>
      ))}

      <Text verbatim style={s.small}>
        {copy(
          'This receipt confirms Batra Connect received the report. It is not an acknowledgement from an external government grievance system.',
          'यह रसीद बत्रा कनेक्ट को रिपोर्ट मिलने की पुष्टि करती है। यह बाहरी सरकारी शिकायत प्रणाली की पावती नहीं है।',
        )}
      </Text>
      <Button
        secondary
        label={copy('Back to reports', 'रिपोर्ट पर वापस')}
        onPress={() => router.dismissTo('/submitted')}
      />
    </Page>
  );
}
export function Updates() {
  return <Gate>{() => <UpdatesBody />}</Gate>;
}
function UpdatesBody() {
  const { call } = useAuth();
  const router = useRouter();
  const copy = useCopy();
  const f = useFormat();
  const list = useResource(
    () => call<{ notifications: Notification[]; unread: number }>('/notifications'),
    [call],
    30000,
  );
  const [error, setError] = useState<unknown>(null);
  async function open(item: Notification) {
    setError(null);
    try {
      if (!item.read_at) await call(`/notifications/${item.id}/read`, { method: 'POST' });
      const route = routeForLink(item.link);
      if (route) router.push(route);
      else void list.reload(true);
    } catch (e) {
      setError(e);
    }
  }
  return (
    <Page>
      <Title verbatim>{copy('Updates', 'अपडेट')}</Title>
      {(list.data?.unread ?? 0) > 0 && (
        <Button
          secondary
          label={copy(`Mark all ${list.data!.unread} as read`, `सभी ${list.data!.unread} पढ़े हुए करें`)}
          onPress={() =>
            void call('/notifications/read-all', { method: 'POST' })
              .then(() => list.reload(true))
              .catch(setError)
          }
        />
      )}
      <Loading
        busy={list.loading && !list.data}
        error={list.error ?? error}
        onRetry={() => void list.reload()}
      />
      {list.data?.notifications.map(item => (
        <Row
          verbatim
          key={item.id}
          title={item.message}
          detail={`${item.read_at ? copy('Read', 'पढ़ा गया') : copy('New', 'नया')} · ${f.date(item.created_at)}`}
          icon={item.read_at ? 'notifications-outline' : 'notifications'}
          color={item.read_at ? C.muted : C.blue}
          onPress={() => void open(item)}
        />
      ))}
      {list.data && !list.data.notifications.length && (
        <Empty
          icon="notifications-outline"
          title={copy('No updates yet', 'अभी कोई अपडेट नहीं')}
          body={copy(
            'Progress on your reports, ideas and appointments will appear here.',
            'आपकी रिपोर्ट, सुझाव और मुलाकात की प्रगति यहाँ दिखेगी।',
          )}
        />
      )}
    </Page>
  );
}
export function OfficeInsights() {
  return <Gate roles={['field', 'department', 'executive', 'admin']}>{() => <InsightsBody />}</Gate>;
}
function InsightsBody() {
  const { session, call } = useAuth();
  const router = useRouter();
  const copy = useCopy();
  const f = useFormat();
  const data = useResource(() => call<Insights>('/insights'), [call], 60000);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [view, setView] = useState<'category' | 'district'>('category');
  const canExport = session!.user.role !== 'field';
  async function exportCsv() {
    setExporting(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/v1/insights/export.csv`, {
        headers: { Authorization: `Bearer ${session!.token}` },
      });
      if (!response.ok)
        throw new Error(copy('Export failed. Try again.', 'निर्यात नहीं हुआ। फिर प्रयास करें।'));
      const text = await response.text();
      const name = `batra-connect-reports-${new Date().toISOString().slice(0, 10)}.csv`;
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const file = new File(Paths.cache, name);
        if (file.exists) file.delete();
        file.create();
        file.write(text);
        await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: name });
      }
    } catch (e) {
      setError(e);
    } finally {
      setExporting(false);
    }
  }
  const d = data.data;
  const rows = d ? (view === 'category' ? d.byCategory : d.byDistrict) : [];
  const max = Math.max(1, ...rows.map(r => r.total));
  const trendMax = Math.max(1, ...(d?.trend ?? []).flatMap(w => [w.created, w.resolved]));
  return (
    <Page>
      <Title verbatim>{copy('Performance dashboard', 'प्रदर्शन डैशबोर्ड')}</Title>
      <Body verbatim>
        {copy('Live figures within your authorised scope.', 'आपके अधिकृत क्षेत्र के वर्तमान आँकड़े।')}
      </Body>
      <Loading busy={data.loading && !d} error={data.error ?? error} onRetry={() => void data.reload()} />
      {d && (
        <>
          <Stats>
            <Stat
              value={d.totals.total}
              label={copy('All reports', 'सभी रिपोर्ट')}
              onPress={() => router.push('/submitted')}
            />
            <Stat
              value={d.totals.open}
              label={copy('Open', 'खुली')}
              tone={C.blue}
              onPress={() => router.push('/submitted')}
            />
            <Stat
              value={d.totals.overdue}
              label={copy('Past deadline', 'समय-सीमा पार')}
              tone={d.totals.overdue ? C.red : C.green}
              onPress={() => router.push({ pathname: '/submitted', params: { overdue: 'true' } })}
            />
            <Stat
              value={d.totals.escalated}
              label={copy('Escalated', 'एस्केलेटेड')}
              tone={d.totals.escalated ? C.red : C.green}
              onPress={() => router.push({ pathname: '/submitted', params: { escalated: 'true' } })}
            />
          </Stats>
          <Section verbatim>{copy('By status', 'स्थिति अनुसार')}</Section>
          <Card>
            {d.byStatus.map(row => (
              <Bar
                key={row.status}
                label={f.status(row.status)}
                value={row.count}
                max={Math.max(1, ...d.byStatus.map(x => x.count))}
              />
            ))}
            {!d.byStatus.length && <Body verbatim>{copy('No reports yet.', 'अभी कोई रिपोर्ट नहीं।')}</Body>}
          </Card>
          <Section verbatim>{copy('Last 12 weeks', 'पिछले 12 सप्ताह')}</Section>
          <Card>
            <View
              accessible
              accessibilityLabel={copy(
                'Weekly reports received and resolved',
                'साप्ताहिक प्राप्त और समाधान की गई रिपोर्ट',
              )}
              style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 120 }}
            >
              {d.trend.map(w => (
                <View key={w.week} style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 1 }}>
                  <View
                    style={{
                      flex: 1,
                      height: Math.max(2, (w.created / trendMax) * 110),
                      backgroundColor: C.blue,
                      borderRadius: 2,
                    }}
                  />
                  <View
                    style={{
                      flex: 1,
                      height: Math.max(2, (w.resolved / trendMax) * 110),
                      backgroundColor: C.green,
                      borderRadius: 2,
                    }}
                  />
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <Text verbatim style={[s.small, { color: C.blue }]}>
                ■ {copy('Received', 'प्राप्त')}: {d.trend.reduce((a, w) => a + w.created, 0)}
              </Text>
              <Text verbatim style={[s.small, { color: C.green }]}>
                ■ {copy('Resolved', 'समाधान')}: {d.trend.reduce((a, w) => a + w.resolved, 0)}
              </Text>
            </View>
          </Card>
          <Chips
            label={copy('Compare', 'तुलना करें')}
            value={view}
            onChange={setView}
            options={[
              { value: 'category', label: copy('Departments', 'विभाग') },
              { value: 'district', label: copy('Districts', 'जिले') },
            ]}
          />
          <Card>
            {rows.map(row => (
              <Bar
                key={row.key}
                label={view === 'district' ? f.district(row.key) : row.key}
                value={row.total}
                max={max}
                color={row.overdue ? C.red : C.blue}
                detail={copy(
                  `${row.open} open · ${row.overdue} past deadline · ${row.avgResolutionHours ?? '–'} h average to resolve · ${row.withinSlaPercent ?? '–'}% within deadline`,
                  `${row.open} खुली · ${row.overdue} समय-सीमा पार · औसत ${row.avgResolutionHours ?? '–'} घंटे में समाधान · ${row.withinSlaPercent ?? '–'}% समय पर`,
                )}
              />
            ))}
            {!rows.length && <Body verbatim>{copy('No data yet.', 'अभी डेटा नहीं।')}</Body>}
          </Card>
          {d.engagement && (
            <>
              <Section verbatim>{copy('Ideas and Jan Samvad', 'सुझाव और जन संवाद')}</Section>
              <Stats>
                {d.engagement.ideas.map(x => (
                  <Stat
                    key={`i-${x.status}`}
                    value={x.count}
                    label={`${copy('Ideas', 'सुझाव')} · ${f.status(x.status)}`}
                  />
                ))}
                {d.engagement.appointments.map(x => (
                  <Stat
                    key={`a-${x.status}`}
                    value={x.count}
                    label={`${copy('Appointments (30 days)', 'मुलाकातें (30 दिन)')} · ${f.status(x.status)}`}
                  />
                ))}
              </Stats>
            </>
          )}
          {canExport && (
            <Button
              secondary
              icon="download-outline"
              disabled={exporting}
              label={
                exporting
                  ? copy('Preparing…', 'तैयार कर रहे हैं…')
                  : copy('Export reports (CSV)', 'रिपोर्ट निर्यात करें (CSV)')
              }
              onPress={() => void exportCsv()}
            />
          )}
          <Text verbatim style={s.small}>
            {copy(
              'Exports contain references, categories, places, status and dates only — no names, contact details or descriptions. Every export is recorded in the audit log.',
              'निर्यात में केवल संदर्भ, श्रेणी, स्थान, स्थिति और तिथियाँ होती हैं — नाम, संपर्क या विवरण नहीं। हर निर्यात ऑडिट लॉग में दर्ज होता है।',
            )}
          </Text>
        </>
      )}
    </Page>
  );
}
