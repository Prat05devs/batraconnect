import React, { useState } from 'react';
import { View } from 'react-native';
import { Pressable } from '@/components/pressable';
import { useRouter, type Href } from 'expo-router';
import { useAuth } from './auth';
import { useFeature } from './app-config';
import type { ComplaintStatus, Role, SubmittedComplaint } from './api-client';
import { Text, useLanguage } from './language';
import { roleLabel } from './labels';
import { Gate, Loading, useCopy, useFormat, useResource } from './connected-ui';
import { Body, C, Card, Icon, Page, Row, Section, Title, s, type IconName } from './ui';

type Tasks = Partial<
  Record<
    | 'toStart'
    | 'inProgress'
    | 'overdue'
    | 'dueSoon'
    | 'toAssign'
    | 'reopened'
    | 'escalated'
    | 'open'
    | 'awaitingCitizen'
    | 'ideasToReview'
    | 'appointmentRequests'
    | 'appointmentsToday'
    | 'appointmentsToClose'
    | 'fieldOfficers'
    | 'unverifiedWards'
    | 'offices'
    | 'failedDeliveries'
    | 'contentDrafts',
    number
  >
>;
type Task = { key: keyof Tasks; title: string; detail: string; href: Href; urgent?: boolean; icon: IconName };
/** One tappable unit of work: the count, a verb-led title, why it matters, and where it goes. */
function TaskCard({ count, task }: { count: number; task: Task }) {
  const router = useRouter();
  const tone = task.urgent ? C.red : C.blue;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${count}. ${task.title}. ${task.detail}`}
      onPress={() => router.push(task.href)}
      style={({ pressed }) => [
        s.row,
        {
          borderColor: task.urgent ? '#F4C7BF' : C.border,
          backgroundColor: task.urgent ? '#FFF7F5' : C.white,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View
        style={{
          minWidth: 52,
          height: 52,
          paddingHorizontal: 8,
          borderRadius: 26,
          backgroundColor: tone,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text verbatim style={{ color: C.white, fontSize: 20, fontWeight: '800' }}>
          {count > 99 ? '99+' : count}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text verbatim style={[s.rowTitle, { fontSize: 17 }]}>
          {task.title}
        </Text>
        <Text verbatim style={s.small}>
          {task.detail}
        </Text>
      </View>
      <Icon name="arrow-forward-circle" color={tone} size={28} />
    </Pressable>
  );
}
function useTaskCatalogue(role: Role): Task[] {
  const copy = useCopy();
  const reports = (params: Record<string, string>): Href => ({ pathname: '/submitted', params });
  const all: Task[] = [
    {
      key: 'overdue',
      urgent: true,
      icon: 'alarm-outline',
      title: copy('Past their deadline', 'समय-सीमा पार'),
      detail:
        role === 'field'
          ? copy(
              'Finish these first — the office is being alerted.',
              'इन्हें पहले पूरा करें — कार्यालय को सूचना जा रही है।',
            )
          : role === 'executive'
            ? copy(
                'Reports past their service deadline across all departments. Open one to see who is responsible.',
                'सभी विभागों में समय-सीमा पार रिपोर्ट। ज़िम्मेदार कौन है, देखने के लिए खोलें।',
              )
            : copy(
                'Act on or reassign these first. Each one is escalating.',
                'इन पर पहले कार्रवाई करें या फिर सौंपें। ये एस्केलेट हो रही हैं।',
              ),
      href: reports({ overdue: 'true' }),
    },
    {
      key: 'escalated',
      urgent: true,
      icon: 'trending-up-outline',
      title: copy('Escalated reports', 'एस्केलेटेड रिपोर्ट'),
      detail:
        role === 'executive'
          ? copy(
              'Reports that stayed past their deadline and were raised to senior officials.',
              'जो रिपोर्ट समय-सीमा के बाद वरिष्ठ अधिकारियों तक पहुँचीं।',
            )
          : copy(
              'Senior officials have been notified. Check progress and unblock.',
              'वरिष्ठ अधिकारियों को सूचना गई है। प्रगति देखें और बाधा हटाएँ।',
            ),
      href: reports({ escalated: 'true' }),
    },
    {
      key: 'toAssign',
      icon: 'person-add-outline',
      title: copy('Assign new reports', 'नई रिपोर्ट सौंपें'),
      detail: copy(
        'Pick a field officer for each. The least busy officer is listed first.',
        'हर एक के लिए फील्ड अधिकारी चुनें। सबसे कम व्यस्त अधिकारी पहले दिखता है।',
      ),
      href: reports({ status: 'Submitted' }),
    },
    {
      key: 'reopened',
      urgent: true,
      icon: 'refresh-outline',
      title: copy('Reopened by citizens', 'नागरिकों ने फिर खोली'),
      detail: copy(
        'The citizen says it is not fixed. Restart work or reassign.',
        'नागरिक के अनुसार समस्या ठीक नहीं हुई। फिर कार्य शुरू करें या फिर सौंपें।',
      ),
      href: reports({ status: 'Reopened' }),
    },
    {
      key: 'toStart',
      icon: 'play-circle-outline',
      title: copy('Start your new assignments', 'नए कार्य शुरू करें'),
      detail: copy(
        'Visit the location, then tap “Start work” with a short note.',
        'स्थान पर जाएँ, फिर छोटी टिप्पणी के साथ “कार्य शुरू करें” दबाएँ।',
      ),
      href: reports({}),
    },
    {
      key: 'inProgress',
      icon: 'construct-outline',
      title: copy('Finish work in progress', 'जारी कार्य पूरा करें'),
      detail: copy(
        'When done, take a photo of the completed work and tap “Mark resolved”.',
        'पूरा होने पर कार्य की फोटो लें और “समाधान दर्ज करें” दबाएँ।',
      ),
      href: reports({ status: 'In progress' }),
    },
    {
      key: 'appointmentRequests',
      icon: 'calendar-outline',
      title: copy('Confirm appointment requests', 'मुलाकात अनुरोधों की पुष्टि करें'),
      detail: copy(
        'Citizens are waiting to hear if their Jan Samvad time is confirmed.',
        'नागरिक जन संवाद समय की पुष्टि की प्रतीक्षा में हैं।',
      ),
      href: { pathname: '/appointments', params: { status: 'Requested' } },
    },
    {
      key: 'appointmentsToClose',
      icon: 'checkmark-done-outline',
      title: copy('Record attendance', 'उपस्थिति दर्ज करें'),
      detail: copy(
        'Mark past appointments as completed or missed.',
        'बीती मुलाकातों को पूर्ण या अनुपस्थित दर्ज करें।',
      ),
      href: { pathname: '/appointments', params: { status: 'Confirmed' } },
    },
    {
      key: 'ideasToReview',
      icon: 'bulb-outline',
      title: copy('Review new ideas', 'नए सुझाव देखें'),
      detail: copy(
        'Reply to citizens and record a decision for each suggestion.',
        'नागरिकों को उत्तर दें और हर सुझाव पर निर्णय दर्ज करें।',
      ),
      href: { pathname: '/submitted-ideas', params: { status: 'Submitted' } },
    },
  ];
  const allowed: Record<Role, (keyof Tasks)[]> = {
    field: ['overdue', 'toStart', 'inProgress'],
    department: [
      'overdue',
      'escalated',
      'reopened',
      'toAssign',
      'appointmentRequests',
      'appointmentsToClose',
      'ideasToReview',
    ],
    admin: [
      'overdue',
      'escalated',
      'reopened',
      'toAssign',
      'appointmentRequests',
      'appointmentsToClose',
      'ideasToReview',
    ],
    executive: ['overdue', 'escalated'],
    citizen: [],
  };
  return all.filter(t => allowed[role].includes(t.key));
}
const greeting = (copy: ReturnType<typeof useCopy>) => {
  const hour = Number(
    new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }),
  );
  return hour < 12
    ? copy('Good morning', 'सुप्रभात')
    : hour < 17
      ? copy('Good afternoon', 'नमस्कार')
      : copy('Good evening', 'शुभ संध्या');
};
/** Staff home: what is waiting on you, in priority order, each one tap from the filtered list. */
export function StaffToday() {
  return <Gate roles={['field', 'department', 'executive', 'admin']}>{() => <TodayBody />}</Gate>;
}
function TodayBody() {
  const { session, call } = useAuth();
  const router = useRouter();
  const copy = useCopy();
  const f = useFormat();
  const { language } = useLanguage();
  const reporting = useFeature('reports'),
    ideasOn = useFeature('ideas'),
    bookingOn = useFeature('appointments');
  const user = session!.user;
  const role = user.role;
  const work = useResource(() => call<{ tasks: Tasks }>('/work').then(r => r.tasks), [call], 60000);
  const catalogue = useTaskCatalogue(role);
  const tasks = work.data ?? {};
  const pending = catalogue.filter(t => (tasks[t.key] ?? 0) > 0);
  const scope = user.jurisdictions ?? [];
  const [guide, setGuide] = useState(false);
  return (
    <Page>
      <View style={{ gap: 4 }}>
        <Text verbatim style={s.small}>
          {greeting(copy)}
          {role === 'executive' ? '' : `, ${user.name.split(' ')[0]}`}
        </Text>
        <Title verbatim>
          {role === 'executive'
            ? copy('Today’s overview', 'आज का सारांश')
            : pending.length
              ? copy('Here is what needs you', 'यह काम आपकी प्रतीक्षा में है')
              : copy('Your work today', 'आज का आपका काम')}
        </Title>
        <Text verbatim style={s.small}>
          {roleLabel(role, language)}
          {scope.length
            ? ` · ${scope
                .slice(0, 2)
                .map(j => `${f.district(j.district)} – ${j.category}`)
                .join(
                  ', ',
                )}${scope.length > 2 ? copy(` +${scope.length - 2} more`, ` +${scope.length - 2} और`) : ''}`
            : ''}
        </Text>
      </View>
      <Loading busy={work.loading && !work.data} error={work.error} onRetry={() => void work.reload()} />
      {work.data && (
        <>
          <Section verbatim>
            {role === 'executive'
              ? copy('Needs attention', 'ध्यान देने योग्य')
              : copy('Needs your action', 'आपकी कार्रवाई चाहिए')}
          </Section>
          {pending.map(task => (
            <TaskCard key={task.key} count={tasks[task.key]!} task={task} />
          ))}
          {!pending.length && (
            <Card>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Icon name="checkmark-circle" color={C.green} size={36} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text verbatim style={s.rowTitle}>
                    {copy('You are all caught up', 'आपका सारा काम पूरा है')}
                  </Text>
                  <Text verbatim style={s.small}>
                    {copy(
                      'New work appears here automatically. You will also get a notification.',
                      'नया काम यहाँ अपने आप दिखेगा। आपको सूचना भी मिलेगी।',
                    )}
                  </Text>
                </View>
              </View>
            </Card>
          )}
          {role === 'department' && tasks.fieldOfficers === 0 && (
            <Card>
              <Text verbatim style={[s.rowTitle, { color: C.red }]}>
                {copy('No field officers in your area yet', 'आपके क्षेत्र में अभी कोई फील्ड अधिकारी नहीं')}
              </Text>
              <Body verbatim>
                {copy(
                  'You cannot assign reports until an administrator adds a field officer for your district and category.',
                  'प्रशासक द्वारा आपके जिले और श्रेणी के लिए फील्ड अधिकारी जोड़ने तक आप रिपोर्ट नहीं सौंप सकते।',
                )}
              </Body>
            </Card>
          )}
          <Section verbatim>{copy('At a glance', 'एक नज़र में')}</Section>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {role === 'field' ? (
              <>
                <Glance value={tasks.inProgress ?? 0} label={copy('In progress', 'कार्य जारी')} />
                <Glance value={tasks.dueSoon ?? 0} label={copy('Due in 24 hours', '24 घंटे में देय')} />
              </>
            ) : (
              <>
                <Glance value={tasks.open ?? 0} label={copy('Open reports', 'खुली रिपोर्ट')} />
                <Glance
                  value={tasks.awaitingCitizen ?? 0}
                  label={copy('Waiting for citizen to confirm', 'नागरिक की पुष्टि की प्रतीक्षा')}
                />
                {role !== 'executive' ? (
                  <Glance
                    value={tasks.appointmentsToday ?? 0}
                    label={copy('Appointments today', 'आज की मुलाकातें')}
                  />
                ) : null}
              </>
            )}
          </View>
        </>
      )}
      <Section verbatim>{copy('Go to', 'यहाँ जाएँ')}</Section>
      {
        <Row
          verbatim
          title={
            role === 'field'
              ? copy('My assigned reports', 'मुझे सौंपी गई रिपोर्ट')
              : role === 'department'
                ? copy('All reports in my area', 'मेरे क्षेत्र की सभी रिपोर्ट')
                : copy('All reports', 'सभी रिपोर्ट')
          }
          detail={copy('Search, filter and open any report', 'कोई भी रिपोर्ट खोजें, फ़िल्टर करें और खोलें')}
          icon="file-tray-full-outline"
          onPress={() => router.push('/submitted')}
        />
      }
      {role !== 'field' && (
        <Row
          verbatim
          title={copy('Performance dashboard', 'प्रदर्शन डैशबोर्ड')}
          detail={copy(
            'Deadlines, trends and comparisons; export to CSV',
            'समय-सीमा, रुझान और तुलना; CSV निर्यात',
          )}
          icon="bar-chart-outline"
          onPress={() => router.navigate('/insights')}
        />
      )}
      {['department', 'admin', 'executive'].includes(role) && (
        <>
          <Row
            verbatim
            title={copy('Jan Samvad appointments', 'जन संवाद मुलाकातें')}
            detail={copy(
              'Requests, confirmed meetings and available times',
              'अनुरोध, पुष्ट मुलाकातें और उपलब्ध समय',
            )}
            icon="calendar-outline"
            onPress={() => router.push('/appointments')}
          />
          <Row
            verbatim
            title={copy('Citizen ideas', 'नागरिकों के सुझाव')}
            detail={copy('Review, reply and record decisions', 'समीक्षा करें, उत्तर दें, निर्णय दर्ज करें')}
            icon="bulb-outline"
            onPress={() => router.push('/submitted-ideas')}
          />
        </>
      )}
      {role !== 'executive' && (
        <>
          <Section verbatim>{copy('As a resident', 'एक निवासी के रूप में')}</Section>
          <Text verbatim style={s.small}>
            {copy(
              'Report something you have noticed, share an idea or book Jan Samvad from this same account. Another officer will handle anything you send.',
              'जो आपने देखा उसकी रिपोर्ट करें, सुझाव दें या जन संवाद बुक करें — इसी खाते से। आपकी भेजी हर चीज़ कोई दूसरा अधिकारी संभालेगा।',
            )}
          </Text>
          {reporting && (
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
            onPress={() => router.push({ pathname: '/submitted', params: { own: 'true' } })}
          />
          {ideasOn && (
            <Row
              verbatim
              title={copy('Share an idea', 'सुझाव दें')}
              icon="bulb-outline"
              onPress={() => router.push('/idea/new')}
            />
          )}
          {bookingOn && (
            <Row
              verbatim
              title={copy('Book Jan Samvad', 'जन संवाद बुक करें')}
              icon="calendar-outline"
              onPress={() => router.push('/appointments/book')}
            />
          )}
        </>
      )}
      <Section verbatim>{copy('Public app', 'सार्वजनिक ऐप')}</Section>
      <Row
        verbatim
        title={copy('Achievements & photos', 'उपलब्धियाँ और फोटो')}
        detail={copy('Achievements, projects and photo gallery', 'उपलब्धियाँ, परियोजनाएँ और चित्र गैलरी')}
        icon="images-outline"
        onPress={() => router.push('/achievements')}
      />
      <Row
        verbatim
        title={copy('Ministerial responsibilities', 'मंत्री के विभागीय कार्य')}
        detail={copy('Transport, IT, science and biotechnology', 'परिवहन, आईटी, विज्ञान और जैव प्रौद्योगिकी')}
        icon="briefcase-outline"
        onPress={() => router.push('/ministries')}
      />
      <Row
        verbatim
        title={copy('MLA of Roorkee', 'रुड़की के विधायक')}
        detail={copy('Constituency work and development', 'विधानसभा क्षेत्र का कार्य और विकास')}
        icon="business-outline"
        onPress={() => router.push('/roorkee')}
      />
      <Row
        verbatim
        title={copy('Schemes & benefits', 'योजनाएँ और लाभ')}
        icon="gift-outline"
        onPress={() => router.push('/schemes')}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: guide }}
        onPress={() => setGuide(!guide)}
        style={({ pressed }) => [s.row, { opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={[s.iconBox, { backgroundColor: C.pale }]}>
          <Icon name="school-outline" />
        </View>
        <Text verbatim style={[s.rowTitle, { flex: 1 }]}>
          {copy('How your work flows', 'आपका काम कैसे चलता है')}
        </Text>
        <Icon name={guide ? 'chevron-up' : 'chevron-down'} color={C.muted} size={20} />
      </Pressable>
      {guide && <RoleGuide role={role} />}
    </Page>
  );
}
const Glance = ({ value, label }: { value: number; label: string }) => (
  <View
    style={{
      flexGrow: 1,
      flexBasis: 140,
      backgroundColor: C.white,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      padding: 14,
      gap: 2,
    }}
  >
    <Text verbatim style={{ fontSize: 24, fontWeight: '800', color: C.navy }}>
      {value}
    </Text>
    <Text verbatim style={s.small}>
      {label}
    </Text>
  </View>
);
function RoleGuide({ role }: { role: Role }) {
  const copy = useCopy();
  const steps: Record<Role, string[]> = {
    field: [
      copy(
        'A department assigns a report to you. You get a notification.',
        'विभाग आपको रिपोर्ट सौंपता है। आपको सूचना मिलती है।',
      ),
      copy(
        'Open it, check the location (tap “Open location in maps”).',
        'इसे खोलें, स्थान देखें (“स्थान मानचित्र में खोलें” दबाएँ)।',
      ),
      copy(
        'Tap “Start work” with a short note so the citizen knows.',
        'नागरिक को बताने के लिए छोटी टिप्पणी के साथ “कार्य शुरू करें” दबाएँ।',
      ),
      copy(
        'When fixed, take a photo of the completed work, explain what was done and tap “Mark resolved”.',
        'ठीक होने पर कार्य की फोटो लें, क्या किया लिखें और “समाधान दर्ज करें” दबाएँ।',
      ),
      copy(
        'The citizen accepts it, or reopens it if it is not fixed — it then comes back to you.',
        'नागरिक स्वीकार करता है, या ठीक न होने पर फिर खोलता है — तब यह आपके पास लौटती है।',
      ),
    ],
    department: [
      copy(
        'New reports in your district and category arrive under “Assign new reports”.',
        'आपके जिले और श्रेणी की नई रिपोर्ट “नई रिपोर्ट सौंपें” में आती हैं।',
      ),
      copy(
        'Open each one and choose a field officer — the least busy is listed first.',
        'हर रिपोर्ट खोलें और फील्ड अधिकारी चुनें — सबसे कम व्यस्त पहले दिखता है।',
      ),
      copy(
        'Each category has a deadline. Reports past it are escalated automatically: first to you, then administrators, then executives.',
        'हर श्रेणी की समय-सीमा है। उसके बाद रिपोर्ट अपने आप एस्केलेट होती है: पहले आपको, फिर प्रशासक, फिर कार्यकारी।',
      ),
      copy(
        'If an officer is overloaded or unavailable, reassign the report from its page.',
        'अधिकारी व्यस्त या अनुपलब्ध हो तो रिपोर्ट के पृष्ठ से फिर सौंपें।',
      ),
      copy(
        'Also confirm Jan Samvad requests and reply to citizen ideas from this screen.',
        'इसी स्क्रीन से जन संवाद अनुरोधों की पुष्टि करें और सुझावों का उत्तर दें।',
      ),
    ],
    admin: [
      copy(
        'In the app you work like a department officer for every area: assign reports, confirm Jan Samvad requests and reply to ideas.',
        'ऐप में आप हर क्षेत्र के लिए विभाग अधिकारी की तरह कार्य करते हैं: रिपोर्ट सौंपें, जन संवाद अनुरोधों की पुष्टि करें और सुझावों का उत्तर दें।',
      ),
      copy(
        'Staff accounts, settings, provider keys, content and reports are managed in the web dashboard.',
        'स्टाफ खाते, सेटिंग, प्रदाता कुंजियाँ, सामग्री और रिपोर्ट वेब डैशबोर्ड में प्रबंधित होती हैं।',
      ),
    ],
    executive: [
      copy(
        'Your view is read-only: you see every report and the performance dashboard.',
        'आपका दृश्य केवल पढ़ने के लिए है: आप हर रिपोर्ट और प्रदर्शन डैशबोर्ड देखते हैं।',
      ),
      copy(
        'Reports that stay past their deadline for three periods are escalated to you.',
        'तीन अवधि तक समय-सीमा पार रही रिपोर्ट आप तक एस्केलेट होती हैं।',
      ),
      copy(
        'Use the dashboard to compare departments and districts and export figures.',
        'विभागों और जिलों की तुलना और आँकड़े निर्यात करने के लिए डैशबोर्ड उपयोग करें।',
      ),
    ],
    citizen: [],
  };
  return (
    <Card>
      {steps[role].map((step, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: C.navy,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text verbatim style={{ color: C.white, fontWeight: '700' }}>
              {i + 1}
            </Text>
          </View>
          <Text verbatim style={[s.body, { flex: 1, color: C.navy }]}>
            {step}
          </Text>
        </View>
      ))}
    </Card>
  );
}
const STAGES: { status: ComplaintStatus[]; en: string; hi: string }[] = [
  { status: ['Submitted'], en: 'Received', hi: 'प्राप्त' },
  { status: ['Assigned', 'Reopened'], en: 'Assigned', hi: 'सौंपी गई' },
  { status: ['In progress'], en: 'Work started', hi: 'कार्य शुरू' },
  { status: ['Resolved'], en: 'Resolved', hi: 'समाधान' },
  { status: ['Closed'], en: 'Closed', hi: 'बंद' },
];
/** Where the report is in its journey and, in one sentence, what this person should do next. */
export function WorkflowGuide({
  report,
  role,
  isAssignee,
}: {
  report: SubmittedComplaint;
  role: Role;
  isAssignee: boolean;
}) {
  const copy = useCopy();
  const current = STAGES.findIndex(stage => stage.status.includes(report.status));
  const yours = (en: string, hi: string) => ({ text: copy(en, hi), mine: true }),
    theirs = (en: string, hi: string) => ({ text: copy(en, hi), mine: false });
  const office = ['department', 'admin'].includes(role);
  const next = (() => {
    switch (report.status) {
      case 'Submitted':
        return office
          ? yours(
              'Choose a field officer just below and assign this report.',
              'नीचे फील्ड अधिकारी चुनें और यह रिपोर्ट सौंपें।',
            )
          : role === 'citizen'
            ? theirs(
                'The office will assign an officer. You will be notified.',
                'कार्यालय अधिकारी नियुक्त करेगा। आपको सूचना मिलेगी।',
              )
            : theirs(
                'Waiting for the department to assign a field officer.',
                'विभाग द्वारा फील्ड अधिकारी नियुक्त करने की प्रतीक्षा।',
              );
      case 'Assigned':
        return isAssignee || office
          ? yours(
              'Visit the location, then add a note and tap “Start work”.',
              'स्थान पर जाएँ, फिर टिप्पणी लिखकर “कार्य शुरू करें” दबाएँ।',
            )
          : theirs(
              'Waiting for the field officer to start work.',
              'फील्ड अधिकारी द्वारा कार्य शुरू करने की प्रतीक्षा।',
            );
      case 'Reopened':
        return isAssignee || office
          ? yours(
              'The citizen says it is not fixed. Read their note in Activity, then restart work or reassign.',
              'नागरिक के अनुसार ठीक नहीं हुआ। गतिविधि में उनकी टिप्पणी पढ़ें, फिर कार्य शुरू करें या फिर सौंपें।',
            )
          : theirs(
              'Sent back for another review. The office has been notified.',
              'फिर समीक्षा के लिए भेजा गया। कार्यालय को सूचना दी गई।',
            );
      case 'In progress':
        return isAssignee || office
          ? yours(
              'When the work is done, add a photo of it, explain what was done and tap “Mark resolved”.',
              'कार्य पूरा होने पर उसकी फोटो जोड़ें, क्या किया लिखें और “समाधान दर्ज करें” दबाएँ।',
            )
          : theirs('Work is under way.', 'कार्य जारी है।');
      case 'Resolved':
        return role === 'citizen'
          ? yours(
              'Check the work. Accept it, or tell the office it is not fixed.',
              'कार्य देखें। स्वीकार करें, या कार्यालय को बताएँ कि ठीक नहीं हुआ।',
            )
          : theirs(
              'Waiting for the citizen to accept or reopen.',
              'नागरिक द्वारा स्वीकार या फिर खोलने की प्रतीक्षा।',
            );
      default:
        return theirs(
          'This report is closed. No action is needed.',
          'यह रिपोर्ट बंद है। कोई कार्रवाई आवश्यक नहीं।',
        );
    }
  })();
  return (
    <Card>
      <View
        accessible
        accessibilityLabel={copy(
          `Stage ${current + 1} of 5: ${STAGES[current]?.en}`,
          `चरण ${current + 1} / 5: ${STAGES[current]?.hi}`,
        )}
        style={{ flexDirection: 'row', alignItems: 'flex-start' }}
      >
        {STAGES.map((stage, i) => (
          <View key={stage.en} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
              <View
                style={{
                  flex: 1,
                  height: 3,
                  backgroundColor: i === 0 ? 'transparent' : i <= current ? C.blue : C.border,
                }}
              />
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor:
                    i < current
                      ? C.blue
                      : i === current
                        ? report.status === 'Reopened'
                          ? C.red
                          : C.blue
                        : C.white,
                  borderWidth: 2,
                  borderColor:
                    i <= current
                      ? i === current && report.status === 'Reopened'
                        ? C.red
                        : C.blue
                      : C.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {i < current ? <Icon name="checkmark" color={C.white} size={14} /> : null}
              </View>
              <View
                style={{
                  flex: 1,
                  height: 3,
                  backgroundColor: i === STAGES.length - 1 ? 'transparent' : i < current ? C.blue : C.border,
                }}
              />
            </View>
            <Text
              verbatim
              style={{
                fontSize: 11,
                textAlign: 'center',
                color: i === current ? C.navy : C.muted,
                fontWeight: i === current ? '700' : '400',
              }}
            >
              {copy(stage.en, stage.hi)}
            </Text>
          </View>
        ))}
      </View>
      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          alignItems: 'flex-start',
          backgroundColor: next.mine ? C.pale : '#F1F3F7',
          padding: 12,
          borderRadius: 12,
        }}
      >
        <Icon
          name={next.mine ? 'hand-right-outline' : 'hourglass-outline'}
          color={next.mine ? C.blue : C.muted}
          size={22}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Text verbatim style={[s.label, { color: next.mine ? C.blue : C.muted }]}>
            {next.mine ? copy('What to do now', 'अभी क्या करें') : copy('What happens next', 'आगे क्या होगा')}
          </Text>
          <Text verbatim style={[s.body, { color: C.navy }]}>
            {next.text}
          </Text>
        </View>
      </View>
    </Card>
  );
}
