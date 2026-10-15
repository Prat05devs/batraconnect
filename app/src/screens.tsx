import { Text, useLanguage } from './language';
import React from 'react';
import { Image, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStore } from './store';
import { usePlanning } from './planning-store';
import { AccountCard } from './AccountScreens';
import { StaffToday } from './OfficeScreens';
import { PublishedEntries } from './ContentScreens';
import { useSubmissions } from './submissions';
import { useCopy, useFormat } from './connected-ui';
import { canActAsResident, isStaff } from './api-client';
import { useAuth } from './auth';
import { useFeature } from './app-config';
import { AchievementHighlights } from './AchievementScreens';
import { filterReports } from './report-search';
import { categories } from './model';
import { Button, Body, Card, C, Field, Icon, Notice, Page, Row, Section, Title, s } from './ui';
export { Services } from './ServiceScreens';
export function Home() {
  const router = useRouter();
  const { reports, draft } = useStore();
  const { session } = useAuth();
  const copy = useCopy();
  const { entries } = useSubmissions();
  const reporting = useFeature('reports'),
    ideasOn = useFeature('ideas'),
    bookingOn = useFeature('appointments');
  if (isStaff(session?.user.role)) return <StaffToday />;
  const unverified =
    session?.user.role === 'citizen' && !session.user.emailVerified && !session.user.phoneVerified;
  return (
    <Page>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={s.small}>A connection that matters</Text>
          <Title>Namaste, Uttarakhand</Title>
        </View>
      </View>
      <View
        style={{
          backgroundColor: C.pale,
          borderRadius: 24,
          overflow: 'hidden',
          minHeight: 224,
          flexDirection: 'row',
        }}
      >
        <View style={{ flex: 1.2, padding: 22, gap: 14 }}>
          <Text style={{ fontSize: 12, letterSpacing: 1.5, fontWeight: '700', color: C.blue }}>
            CITIZEN CONNECT
          </Text>
          <Text style={{ fontSize: 27, lineHeight: 34, fontWeight: '700', color: C.navy }}>
            Your voice.{'\n'}Our shared future.
          </Text>
          <Text style={s.small}>A simpler way to raise issues and find public services.</Text>
        </View>
        <Image
          source={require('../assets/photos/pradeep-batra.jpeg')}
          accessibilityLabel="Photograph of Pradeep Batra"
          style={{ flex: 1, width: '44%', height: '100%' }}
          resizeMode="cover"
        />
      </View>
      {reporting ? (
        <Button
          label={draft.category || draft.title ? 'Continue your report' : 'Report a problem'}
          icon="create-outline"
          onPress={() => router.push('/report')}
        />
      ) : (
        <Notice>
          {copy(
            'Reporting a problem is paused for a short time. Please try again later.',
            'समस्या बताना कुछ समय के लिए रुका है। कृपया बाद में प्रयास करें।',
          )}
        </Notice>
      )}
      {unverified ? (
        <>
          <Notice error>
            {copy(
              'Verify your email or mobile number so you can send reports.',
              'रिपोर्ट भेजने के लिए अपना ईमेल या मोबाइल नंबर सत्यापित करें।',
            )}
          </Notice>
          <Button
            secondary
            label={copy('Verify now', 'अभी सत्यापित करें')}
            onPress={() => router.push('/verify')}
          />
        </>
      ) : !session ? (
        <Notice>Reports can be saved on this device or sent to Batra Connect after signing in.</Notice>
      ) : null}
      {entries.length > 0 && (
        <Row
          verbatim
          title={copy(
            `${entries.length} report${entries.length === 1 ? '' : 's'} waiting to send`,
            `${entries.length} रिपोर्ट भेजने की प्रतीक्षा में`,
          )}
          detail={
            entries.some(e => e.needsAttention)
              ? copy(
                  'One needs your attention — open to fix',
                  'एक पर आपका ध्यान चाहिए — ठीक करने के लिए खोलें',
                )
              : copy('They will send automatically when you are online', 'ऑनलाइन होते ही अपने आप भेजी जाएँगी')
          }
          icon="cloud-upload-outline"
          color={entries.some(e => e.needsAttention) ? C.red : C.blue}
          onPress={() => router.navigate('/requests')}
        />
      )}
      <Row
        title={session ? 'Submitted reports' : 'Sign in to send reports'}
        detail={
          session ? 'Track reports received by Batra Connect' : 'Create an account and follow report updates'
        }
        icon="cloud-outline"
        onPress={() => router.push(session ? '/submitted' : '/sign-in')}
      />
      {session && (
        <Row
          verbatim
          title={copy('Updates', 'अपडेट')}
          detail={copy(
            'Progress on your reports, ideas and appointments',
            'आपकी रिपोर्ट, सुझाव और मुलाकातों की प्रगति',
          )}
          icon="notifications-outline"
          onPress={() => router.push('/updates')}
        />
      )}
      <PublishedEntries
        type="announcement"
        limit={3}
        heading={copy('Latest from the office', 'कार्यालय से नवीनतम')}
      />
      <Section>How can we help?</Section>
      <Row
        title="Ask the app guide"
        detail="Short answers and a clear next step · Works offline"
        icon="chatbubbles-outline"
        onPress={() => router.navigate('/guide')}
      />
      <Row
        title="Track your requests"
        detail={`${reports.length} locally saved ${reports.length === 1 ? 'request' : 'requests'}`}
        icon="document-text-outline"
        color={C.green}
        tint="#E9F7F1"
        onPress={() => router.navigate('/requests')}
      />
      <Row
        title="Explore public services"
        detail="Public information and steps, all in one place"
        icon="grid-outline"
        onPress={() => router.navigate('/services')}
      />
      <AchievementHighlights />
      <Section>Shape your community</Section>
      {ideasOn && (
        <Row
          title="Ideas & projects"
          detail="Keep a suggestion ready for the future"
          icon="bulb-outline"
          onPress={() => router.push('/ideas')}
        />
      )}
      {bookingOn && (
        <Row
          verbatim
          title={copy('Jan Samvad appointments', 'जन संवाद मुलाकातें')}
          detail={copy(
            'Book a time to meet the office, or prepare your notes',
            'कार्यालय से मिलने का समय बुक करें या अपने नोट तैयार करें',
          )}
          icon="calendar-outline"
          onPress={() => router.push(session ? '/appointments' : '/meetings')}
        />
      )}
      <Row
        title="Schemes & benefits"
        detail="Know what to check before applying"
        icon="gift-outline"
        onPress={() => router.push('/schemes')}
      />
      <Card>
        <Icon name="people-outline" />
        <Section>Built around your needs</Section>
        <Body>
          Choose a category, explain the issue, add its location, and review your report before saving.
        </Body>
        <Text style={s.small}>Batra Connect · Citizen experience</Text>
      </Card>
    </Page>
  );
}
export function Requests() {
  const router = useRouter();
  const { reports } = useStore();
  const copy = useCopy();
  const { entries, retry } = useSubmissions();
  const queued = new Map(entries.map(e => [e.localId, e]));
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [filters, setFilters] = React.useState(false);
  const [order, setOrder] = React.useState<'newest' | 'oldest'>('newest');
  const visible = filterReports(reports, query, '', category, order);
  const reset = () => {
    setQuery('');
    setCategory('');
    setOrder('newest');
  };
  return (
    <Page>
      <Title>My requests</Title>
      <Row
        title="Submitted reports"
        detail="Track reports received by Batra Connect"
        icon="cloud-outline"
        onPress={() => router.push('/submitted')}
      />
      <Body>Follow the reports you have saved on this device.</Body>
      {entries.length > 0 && (
        <Card>
          <Text verbatim style={s.label}>
            {copy(`${entries.length} waiting to send`, `${entries.length} भेजने की प्रतीक्षा में`)}
          </Text>
          {entries.map(e => (
            <Text key={e.localId} verbatim style={[s.small, e.needsAttention && { color: C.red }]}>
              {e.draft.title}:{' '}
              {e.needsAttention
                ? `${copy('Needs attention', 'ध्यान चाहिए')} — ${e.lastError ?? ''}`
                : e.attempts
                  ? copy('Will retry automatically', 'अपने आप फिर प्रयास होगा')
                  : copy('Sending…', 'भेज रहे हैं…')}
            </Text>
          ))}
          <Button
            secondary
            label={copy('Try sending now', 'अभी भेजने का प्रयास करें')}
            onPress={() => void retry()}
          />
        </Card>
      )}
      {reports.length > 0 && (
        <>
          <Field
            label="Search your reports"
            value={query}
            onChangeText={setQuery}
            maxLength={100}
            placeholder="Title, reference, district or landmark"
          />
          <Button
            secondary
            label={filters ? 'Hide category filters' : `Category: ${category || 'All'}`}
            onPress={() => setFilters(!filters)}
          />
          {filters &&
            ['', ...categories.map(c => c.name)].map(value => (
              <Row
                key={value}
                title={value || 'All categories'}
                icon="funnel-outline"
                selected={category === value}
                onPress={() => {
                  setCategory(value);
                  setFilters(false);
                }}
              />
            ))}
          <Button
            secondary
            label={order === 'newest' ? 'Newest first · Change to oldest' : 'Oldest first · Change to newest'}
            onPress={() => setOrder(order === 'newest' ? 'oldest' : 'newest')}
          />
          <Text accessibilityLiveRegion="polite" style={s.label}>
            {visible.length} of {reports.length} reports
          </Text>
        </>
      )}
      {visible.map(r => {
        const q = queued.get(r.id);
        return (
          <Row
            verbatim
            navigates
            key={r.id}
            title={r.title}
            detail={`${r.sent ? r.sent.reference : r.id}\n${r.district} · ${r.sent ? copy('Sent to Batra Connect', 'बत्रा कनेक्ट को भेजी गई') : q ? (q.needsAttention ? copy('Not sent — needs attention', 'नहीं भेजी गई — ध्यान चाहिए') : copy('Waiting to send', 'भेजने की प्रतीक्षा')) : copy('Only on this device', 'केवल इस डिवाइस पर')}`}
            icon={r.sent ? 'cloud-done-outline' : q ? 'cloud-upload-outline' : 'phone-portrait-outline'}
            color={q?.needsAttention ? C.red : r.sent ? C.green : C.blue}
            onPress={() => router.push({ pathname: '/request/[id]', params: { id: r.id } })}
          />
        );
      })}
      {!visible.length && (
        <Card>
          <Icon name="file-tray-outline" size={40} />
          <Section>{reports.length ? 'No matching reports' : 'Your first step starts here'}</Section>
          <Body>
            {reports.length
              ? 'Try a different term or show all categories.'
              : 'No requests yet. Tell us about an issue in your area.'}
          </Body>
          <Button
            label={reports.length ? 'Reset search and filters' : 'Report a problem'}
            onPress={reports.length ? reset : () => router.push('/report')}
          />
        </Card>
      )}
    </Page>
  );
}
export function Profile() {
  const router = useRouter();
  const { clear } = useStore();
  const planning = usePlanning();
  const { session } = useAuth();
  const copy = useCopy();
  const submissions = useSubmissions();
  const role = session?.user.role;
  const staff = isStaff(role);
  const [error, setError] = React.useState('');
  const [confirmClear, setConfirmClear] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);
  return (
    <Page>
      <Title verbatim>{staff ? copy('Your account', 'आपका खाता') : copy('Profile', 'प्रोफ़ाइल')}</Title>
      <AccountCard />
      {role === 'admin' && (
        <Notice>
          {copy(
            'Administration (staff, settings, keys, reports and content) is done in the web dashboard.',
            'प्रशासन (स्टाफ, सेटिंग, कुंजियाँ, रिपोर्ट और सामग्री) वेब डैशबोर्ड में किया जाता है।',
          )}
        </Notice>
      )}
      {session && canActAsResident(role) && (
        <>
          <Section verbatim>
            {staff ? copy('As a resident', 'एक निवासी के रूप में') : copy('Your activity', 'आपकी गतिविधि')}
          </Section>
          {staff && (
            <Row
              verbatim
              title={copy('Report a problem', 'समस्या बताएँ')}
              icon="create-outline"
              onPress={() => router.push('/report')}
            />
          )}
          <Row
            verbatim
            title={copy('Reports you sent', 'आपकी भेजी रिपोर्ट')}
            icon="cloud-outline"
            onPress={() =>
              router.push(staff ? { pathname: '/submitted', params: { own: 'true' } } : '/submitted')
            }
          />
          <Row
            verbatim
            title={copy('Ideas you sent to the office', 'कार्यालय को भेजे आपके सुझाव')}
            icon="bulb-outline"
            onPress={() =>
              router.push(
                staff ? { pathname: '/submitted-ideas', params: { own: 'true' } } : '/submitted-ideas',
              )
            }
          />
          <Row
            verbatim
            title={copy('Your Jan Samvad appointments', 'आपकी जन संवाद मुलाकातें')}
            icon="calendar-outline"
            onPress={() =>
              router.push(staff ? { pathname: '/appointments', params: { own: 'true' } } : '/appointments')
            }
          />
          {staff && (
            <Row
              verbatim
              title={copy('Reports saved on this phone', 'इस फ़ोन पर सहेजी रिपोर्ट')}
              icon="phone-portrait-outline"
              onPress={() => router.navigate('/requests')}
            />
          )}
        </>
      )}
      <Section verbatim>{copy('Explore', 'देखें')}</Section>
      <Row
        verbatim
        title={copy('Achievements & photos', 'उपलब्धियाँ और फोटो')}
        detail={copy('Achievements, projects and photo gallery', 'उपलब्धियाँ, परियोजनाएँ और चित्र गैलरी')}
        icon="images-outline"
        onPress={() => router.push('/achievements')}
      />
      <Row
        verbatim
        title={copy('Schemes & benefits', 'योजनाएँ और लाभ')}
        icon="gift-outline"
        onPress={() => router.push('/schemes')}
      />
      {canActAsResident(role) && (
        <>
          <Section verbatim>{copy('On this device', 'इस डिवाइस पर')}</Section>
          <Body verbatim>
            {copy(
              'Drafts, saved reports, ideas, meeting notes, bookmarks, saved schemes and photos are kept on this device. On Android and iOS they are encrypted with a key held in the phone’s secure storage.',
              'ड्राफ्ट, सहेजी रिपोर्ट, सुझाव, बैठक नोट, बुकमार्क, सहेजी योजनाएँ और फोटो इस डिवाइस पर रहते हैं। Android और iOS पर ये फ़ोन के सुरक्षित भंडार की कुंजी से एन्क्रिप्ट होते हैं।',
            )}
          </Body>
          {error ? <Notice error>{error}</Notice> : null}
          {confirmClear ? (
            <Card>
              <Section verbatim>{copy('Clear data on this device?', 'इस डिवाइस का डेटा साफ करें?')}</Section>
              <Body verbatim>
                {copy(
                  'This removes saved reports, ideas, meeting notes, bookmarks, saved schemes, drafts and photos from this phone. Reports already sent to Batra Connect and your account are not affected.',
                  'इससे इस फ़ोन से सहेजी रिपोर्ट, सुझाव, बैठक नोट, बुकमार्क, सहेजी योजनाएँ, ड्राफ्ट और फोटो हट जाएँगी। बत्रा कनेक्ट को भेजी गई रिपोर्ट और आपका खाता प्रभावित नहीं होंगे।',
                )}
              </Body>
              <Button
                disabled={clearing}
                label={clearing ? copy('Clearing…', 'साफ कर रहे हैं…') : copy('Clear data', 'डेटा साफ करें')}
                onPress={() => {
                  setClearing(true);
                  void clear()
                    .then(() => planning.clear())
                    .then(() => submissions.clear())
                    .then(() => {
                      setConfirmClear(false);
                      setError('');
                    })
                    .catch(() =>
                      setError(
                        copy(
                          'Some data could not be cleared. Try again to finish.',
                          'कुछ डेटा साफ नहीं हो सका। पूरा करने के लिए फिर प्रयास करें।',
                        ),
                      ),
                    )
                    .finally(() => setClearing(false));
                }}
              />
              <Button
                secondary
                disabled={clearing}
                label={copy('Cancel', 'रद्द करें')}
                onPress={() => setConfirmClear(false)}
              />
            </Card>
          ) : (
            <Button
              secondary
              label={copy('Clear data on this device', 'इस डिवाइस का डेटा साफ करें')}
              onPress={() => setConfirmClear(true)}
            />
          )}
        </>
      )}
    </Page>
  );
}
export function Detail() {
  const { language } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const report = useStore().reports.find(r => r.id === id);
  const { session } = useAuth();
  const copy = useCopy();
  const f = useFormat();
  const { entries, send, remove } = useSubmissions();
  const [sending, setSending] = React.useState(false);
  const [sendError, setSendError] = React.useState('');
  if (!report)
    return (
      <Page>
        <Title>Request unavailable</Title>
        <Body>This local report may have been cleared.</Body>
      </Page>
    );
  const category = categories.find(c => c.name === report.category);
  return (
    <Page>
      <Text style={s.badge}>{report.status}</Text>
      <Title verbatim>{report.title}</Title>
      <Text selectable style={s.small}>
        {report.id}
      </Text>
      <Card>
        <Text style={s.label}>{category?.name}</Text>
        <Body verbatim>{report.description}</Body>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Icon name="location-outline" />
          <Text verbatim style={[s.body, { flex: 1 }]}>
            {report.locality}, {report.district}
          </Text>
        </View>
      </Card>
      {report.photos.length > 0 && (
        <>
          <Section>Attached evidence</Section>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {report.photos.map((uri, i) => (
              <Image
                key={uri}
                source={{ uri }}
                accessibilityLabel={`Evidence photo ${i + 1}`}
                style={{ width: 128, height: 128, borderRadius: 14 }}
              />
            ))}
          </View>
        </>
      )}
      <Section>Activity</Section>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Icon name="checkmark-circle" color={C.green} />
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Saved on this device</Text>
            <Text style={s.small}>
              {new Date(report.createdAt).toLocaleString(language === 'hi' ? 'hi-IN' : 'en-IN', {
                timeZone: 'Asia/Kolkata',
              })}{' '}
              IST
            </Text>
          </View>
        </View>
        {report.sent ? (
          <Text verbatim style={s.small}>
            {copy('Sent to Batra Connect', 'बत्रा कनेक्ट को भेजी गई')}: {f.date(report.sent.sentAt)}
          </Text>
        ) : (
          <Body>No department acknowledgement or official status is available yet.</Body>
        )}
      </Card>
      {(() => {
        const q = entries.find(e => e.localId === report.id);
        if (report.sent)
          return (
            <Button
              label={copy(`Track ${report.sent.reference}`, `${report.sent.reference} ट्रैक करें`)}
              icon="cloud-done-outline"
              onPress={() => router.push({ pathname: '/submitted/[id]', params: { id: report.sent!.id } })}
            />
          );
        if (!session)
          return (
            <Button
              secondary
              label={copy(
                'Sign in to send this report to Batra Connect',
                'यह रिपोर्ट बत्रा कनेक्ट को भेजने के लिए लॉगिन करें',
              )}
              onPress={() => router.push('/sign-in')}
            />
          );
        return (
          <Card>
            <Text verbatim style={s.label}>
              {q
                ? q.needsAttention
                  ? copy('This report could not be sent', 'यह रिपोर्ट नहीं भेजी जा सकी')
                  : copy('Waiting to send', 'भेजने की प्रतीक्षा')
                : copy('Only on this device', 'केवल इस डिवाइस पर')}
            </Text>
            {q?.lastError ? (
              <Notice error>{q.lastError}</Notice>
            ) : (
              <Body verbatim>
                {q
                  ? copy(
                      'It will be sent automatically when you are online.',
                      'ऑनलाइन होते ही यह अपने आप भेजी जाएगी।',
                    )
                  : copy(
                      'Send it to get a receipt number and follow the office’s progress.',
                      'रसीद संख्या पाने और कार्यालय की प्रगति देखने के लिए इसे भेजें।',
                    )}
              </Body>
            )}
            {sendError ? <Notice error>{sendError}</Notice> : null}
            <Button
              disabled={sending}
              icon="send-outline"
              label={
                sending
                  ? copy('Sending…', 'भेज रहे हैं…')
                  : q
                    ? copy('Try sending again', 'फिर भेजें')
                    : copy('Send to Batra Connect', 'बत्रा कनेक्ट को भेजें')
              }
              onPress={() => {
                setSending(true);
                setSendError('');
                void send(report)
                  .then(r => {
                    if (r.status === 'sent')
                      router.push({ pathname: '/submitted/[id]', params: { id: r.complaint.id } });
                    else if (r.error) setSendError(r.error);
                  })
                  .catch(e => setSendError(f.error(e)))
                  .finally(() => setSending(false));
              }}
            />
            {q?.needsAttention && (
              <Button
                secondary
                label={copy('Stop trying to send', 'भेजने का प्रयास रोकें')}
                onPress={() => void remove(report.id)}
              />
            )}
          </Card>
        );
      })()}
      <Button label="Back to home" secondary onPress={() => router.dismissTo('/')} />
    </Page>
  );
}
export function Confirmation() {
  const router = useRouter();
  const copy = useCopy();
  const { id, outcome } = useLocalSearchParams<{ id: string; outcome?: 'queued' | 'attention' }>();
  const queued = useSubmissions().entries.find(e => e.localId === id);
  return (
    <Page>
      {outcome && (
        <Notice error={outcome === 'attention'}>
          {outcome === 'queued'
            ? copy(
                'You appear to be offline. Your report is saved and will be sent automatically as soon as you are back online. You will get a receipt then.',
                'आप ऑफ़लाइन लगते हैं। आपकी रिपोर्ट सहेजी गई है और ऑनलाइन होते ही अपने आप भेजी जाएगी। तब आपको रसीद मिलेगी।',
              )
            : `${copy('Saved, but not sent', 'सहेजी गई, पर भेजी नहीं गई')}: ${queued?.lastError ?? ''} ${copy('Open the report to fix and resend it.', 'ठीक करके फिर भेजने के लिए रिपोर्ट खोलें।')}`}
        </Notice>
      )}
      <View style={{ alignItems: 'center', paddingVertical: 28, gap: 20 }}>
        <View style={[s.iconBox, { width: 88, height: 88, borderRadius: 44, backgroundColor: '#E9F7F1' }]}>
          <Icon name="checkmark" size={44} color={C.green} />
        </View>
        <Title>Your report is saved</Title>
        <Body>You can return to it in My requests.</Body>
      </View>
      <Card>
        <Text style={s.small}>LOCAL REFERENCE</Text>
        <Text selectable style={[s.section, { fontSize: 18 }]}>
          {id}
        </Text>
        <Notice>
          {copy(
            'This report is saved only on this phone. Open it and tap “Send to Batra Connect” to get a receipt and follow progress.',
            'यह रिपोर्ट केवल इस फ़ोन पर सहेजी गई है। रसीद पाने और प्रगति देखने के लिए इसे खोलकर “बत्रा कनेक्ट को भेजें” दबाएँ।',
          )}
        </Notice>
      </Card>
      <Button
        label="View request"
        onPress={() => router.replace({ pathname: '/request/[id]', params: { id } })}
      />
      <Button label="Back to home" secondary onPress={() => router.dismissTo('/')} />
    </Page>
  );
}
