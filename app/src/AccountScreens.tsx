import React, { useState } from 'react';
import { Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api, useAuth } from './auth';
import type { Account, Session } from './api-client';
import { Text, useLanguage } from './language';
import { roleLabel } from './labels';
import { pushState, type PushState } from './push';
import { Badge, Chips, Gate, Loading, Toggle, useCopy, useFormat, useResource } from './connected-ui';
import { Body, Button, Card, Field, Notice, Page, Row, Section, Title, s } from './ui';
import { disclaimer, links, open } from './legal';
import { useEmailCodes, useNeedsVerification, useVerificationRequired } from './app-config';

const phoneHint = (copy: ReturnType<typeof useCopy>) =>
  copy(
    'Use international format, e.g. +919876543210.',
    'अंतरराष्ट्रीय प्रारूप में लिखें, जैसे +919876543210।',
  );
const normalizePhone = (value: string) => {
  const digits = value.replace(/[\s-]/g, '');
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : digits;
};

export function SignIn() {
  const { signIn, acceptSession, session, ready } = useAuth();
  const router = useRouter();
  const copy = useCopy();
  const f = useFormat();
  const emailCodes = useEmailCodes(),
    verificationRequired = useVerificationRequired();
  const [mode, setMode] = useState<'password' | 'code' | 'register'>('password');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [destination, setDestination] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [info, setInfo] = useState('');
  if (session)
    return (
      <Page>
        <Title verbatim>{copy('You are signed in', 'आप लॉगिन हैं')}</Title>
        <Body verbatim>{session.user.name}</Body>
        <Button label={copy('Continue', 'आगे बढ़ें')} onPress={() => router.dismissTo('/')} />
      </Page>
    );
  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setInfo('');
    try {
      await task();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  const done = (user: Account) => {
    setPassword('');
    router.replace(
      verificationRequired && user.role === 'citizen' && !user.emailVerified && !user.phoneVerified
        ? '/verify'
        : '/',
    );
  };
  return (
    <Page>
      <Title verbatim>
        {mode === 'register'
          ? copy('Create your account', 'अपना खाता बनाएँ')
          : copy('Sign in to Batra Connect', 'बत्रा कनेक्ट में लॉगिन करें')}
      </Title>
      <Body verbatim>
        {copy(
          'Send reports, share ideas, book Jan Samvad and follow progress across your devices.',
          'रिपोर्ट भेजें, सुझाव दें, जन संवाद बुक करें और अपने डिवाइसों पर प्रगति देखें।',
        )}
      </Body>
      {mode !== 'register' && emailCodes && (
        <Chips
          label={copy('Sign in with', 'लॉगिन का तरीका')}
          value={mode}
          onChange={value => {
            setMode(value);
            setError(null);
            setCodeSent(false);
          }}
          options={[
            { value: 'password', label: copy('Password', 'पासवर्ड') },
            { value: 'code', label: copy('One-time code', 'एक बार का कोड') },
          ]}
        />
      )}
      {mode === 'code' ? (
        <>
          <Field
            label={copy('Email or verified mobile number', 'ईमेल या सत्यापित मोबाइल नंबर')}
            value={destination}
            onChangeText={setDestination}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            maxLength={254}
            editable={!busy && !codeSent}
          />
          {!codeSent ? (
            <Button
              disabled={busy || !destination.trim()}
              label={busy ? copy('Please wait…', 'कृपया प्रतीक्षा करें…') : copy('Send code', 'कोड भेजें')}
              onPress={() =>
                void run(async () => {
                  const value = destination.includes('@')
                    ? destination.trim().toLowerCase()
                    : normalizePhone(destination);
                  setDestination(value);
                  await api('/auth/otp/request', { method: 'POST', body: { destination: value } });
                  setCodeSent(true);
                  setInfo(
                    copy(
                      'If this email or verified mobile number has an account, a 6-digit code has been sent. It is valid for 10 minutes.',
                      'यदि इस ईमेल या सत्यापित मोबाइल नंबर से खाता है, तो 6 अंकों का कोड भेजा गया है। यह 10 मिनट तक मान्य है।',
                    ),
                  );
                })
              }
            />
          ) : (
            <>
              <Field
                label={copy('6-digit code', '6 अंकों का कोड')}
                value={code}
                onChangeText={v => setCode(v.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                editable={!busy}
              />
              <Button
                disabled={busy || code.length !== 6}
                label={busy ? copy('Please wait…', 'कृपया प्रतीक्षा करें…') : copy('Sign in', 'लॉगिन करें')}
                onPress={() =>
                  void run(async () => {
                    const result = await api<Session>('/auth/otp/verify', {
                      method: 'POST',
                      body: { destination, code },
                    });
                    await acceptSession(result);
                    done(result.user);
                  })
                }
              />
              <Button
                secondary
                disabled={busy}
                label={copy('Use a different email or number', 'दूसरा ईमेल या नंबर उपयोग करें')}
                onPress={() => {
                  setCodeSent(false);
                  setCode('');
                  setInfo('');
                }}
              />
            </>
          )}
        </>
      ) : (
        <>
          {mode === 'register' && (
            <Field
              label={copy('Your name', 'आपका नाम')}
              value={name}
              onChangeText={setName}
              autoComplete="name"
              maxLength={100}
              editable={!busy}
            />
          )}
          <Field
            label={copy('Email address', 'ईमेल पता')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            maxLength={254}
            editable={!busy}
          />
          {mode === 'register' && (
            <>
              <Field
                label={copy('Mobile number (optional)', 'मोबाइल नंबर (वैकल्पिक)')}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                maxLength={16}
                editable={!busy}
              />
              <Text verbatim style={s.small}>
                {phoneHint(copy)}
              </Text>
            </>
          )}
          <Field
            label={copy('Password', 'पासवर्ड')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            maxLength={128}
            editable={!busy}
          />
          {mode === 'register' && (
            <Text verbatim style={s.small}>
              {verificationRequired
                ? copy(
                    'Use at least 12 characters. We will email you a code to verify your address. Staff accounts are created by an administrator.',
                    'कम से कम 12 अक्षर रखें। ईमेल सत्यापन के लिए हम कोड भेजेंगे। स्टाफ खाते प्रशासक बनाते हैं।',
                  )
                : copy(
                    'Use at least 12 characters. Staff accounts are created by an administrator.',
                    'कम से कम 12 अक्षर रखें। स्टाफ खाते प्रशासक बनाते हैं।',
                  )}
            </Text>
          )}
          <Button
            disabled={busy || !ready}
            label={
              busy
                ? copy('Please wait…', 'कृपया प्रतीक्षा करें…')
                : mode === 'register'
                  ? copy('Create account', 'खाता बनाएँ')
                  : copy('Sign in', 'लॉगिन करें')
            }
            onPress={() =>
              void run(async () => {
                await signIn(
                  email.trim(),
                  password,
                  mode === 'register' ? name.trim() : undefined,
                  phone.trim() ? normalizePhone(phone) : undefined,
                );
                setPassword('');
                router.replace(mode === 'register' && verificationRequired ? '/verify' : '/');
              })
            }
          />
          {mode === 'password' && (
            <Button
              secondary
              disabled={busy}
              label={copy('Forgot password?', 'पासवर्ड भूल गए?')}
              onPress={() => (emailCodes ? router.push('/forgot-password') : open(links.passwordHelp))}
            />
          )}
          {mode === 'password' && !emailCodes && (
            <Text verbatim style={s.small}>
              {copy(
                'Forgot your password? Email admin@wtsolutions.cc from the address on your account and we will reset it.',
                'पासवर्ड भूल गए? अपने खाते वाले ईमेल से admin@wtsolutions.cc पर लिखें, हम उसे रीसेट कर देंगे।',
              )}
            </Text>
          )}
        </>
      )}
      {info ? <Notice>{info}</Notice> : null}
      {error ? <Notice error>{f.error(error)}</Notice> : null}
      <Button
        secondary
        disabled={busy}
        label={
          mode === 'register'
            ? copy('Already have an account? Sign in', 'पहले से खाता है? लॉगिन करें')
            : copy('New here? Create an account', 'नए हैं? खाता बनाएँ')
        }
        onPress={() => {
          setMode(mode === 'register' ? 'password' : 'register');
          setError(null);
          setPassword('');
        }}
      />
      <Text verbatim style={s.small}>
        {copy('By continuing you agree to the ', 'आगे बढ़कर आप ')}
        <Text
          verbatim
          style={{ fontWeight: '600', textDecorationLine: 'underline' }}
          onPress={() => open(links.terms)}
        >
          {copy('Terms of use', 'उपयोग की शर्तों')}
        </Text>
        {copy(' and ', ' और ')}
        <Text
          verbatim
          style={{ fontWeight: '600', textDecorationLine: 'underline' }}
          onPress={() => open(links.privacy)}
        >
          {copy('Privacy policy', 'गोपनीयता नीति')}
        </Text>
        {copy('.', ' से सहमत होते हैं।')}
      </Text>
      <Text verbatim style={s.small}>
        {copy(disclaimer.en, disclaimer.hi)}
      </Text>
      {Platform.OS === 'web' && (
        <Text verbatim style={s.small}>
          {copy(
            'On the web, sign in again after refreshing the page.',
            'वेब पर पृष्ठ रीफ्रेश करने के बाद फिर लॉगिन करें।',
          )}
        </Text>
      )}
    </Page>
  );
}
export function ForgotPassword() {
  const { acceptSession } = useAuth();
  const router = useRouter();
  const copy = useCopy();
  const f = useFormat();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page>
      <Title verbatim>{copy('Reset your password', 'पासवर्ड बदलें')}</Title>
      <Body verbatim>
        {copy(
          'We will email a 6-digit code. New staff can use the code from their invitation email here.',
          'हम 6 अंकों का कोड ईमेल करेंगे। नए स्टाफ अपने आमंत्रण ईमेल का कोड यहाँ उपयोग कर सकते हैं।',
        )}
      </Body>
      <Field
        label={copy('Email address', 'ईमेल पता')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        maxLength={254}
        editable={!busy}
      />
      {!sent ? (
        <>
          <Button
            disabled={busy || !email.includes('@')}
            label={copy('Email me a code', 'मुझे कोड ईमेल करें')}
            onPress={() =>
              void run(async () => {
                await api('/auth/password/forgot', {
                  method: 'POST',
                  body: { email: email.trim().toLowerCase() },
                });
                setSent(true);
              })
            }
          />
          <Button
            secondary
            label={copy('I already have a code', 'मेरे पास कोड है')}
            onPress={() => setSent(true)}
          />
        </>
      ) : (
        <>
          <Notice>
            {copy(
              'If an account uses this email, a code has been sent. Check spam if it does not arrive within a few minutes.',
              'यदि इस ईमेल से खाता है, तो कोड भेजा गया है। कुछ मिनट में न आए तो स्पैम देखें।',
            )}
          </Notice>
          <Field
            label={copy('6-digit code', '6 अंकों का कोड')}
            value={code}
            onChangeText={v => setCode(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            editable={!busy}
          />
          <Field
            label={copy('New password', 'नया पासवर्ड')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            maxLength={128}
            editable={!busy}
          />
          <Text verbatim style={s.small}>
            {copy(
              'At least 12 characters. All other devices will be signed out.',
              'कम से कम 12 अक्षर। अन्य सभी डिवाइस से लॉगआउट हो जाएगा।',
            )}
          </Text>
          <Button
            disabled={busy || code.length !== 6 || password.length < 12}
            label={
              busy
                ? copy('Please wait…', 'कृपया प्रतीक्षा करें…')
                : copy('Set new password', 'नया पासवर्ड सेट करें')
            }
            onPress={() =>
              void run(async () => {
                const result = await api<Session>('/auth/password/reset', {
                  method: 'POST',
                  body: { email: email.trim().toLowerCase(), code, password },
                });
                await acceptSession(result);
                router.dismissTo('/');
              })
            }
          />
        </>
      )}
      {error ? <Notice error>{f.error(error)}</Notice> : null}
    </Page>
  );
}
export function Verify() {
  return <Gate>{() => <VerifyBody />}</Gate>;
}
function VerifyBody() {
  const { session, call, updateUser } = useAuth();
  const router = useRouter();
  const copy = useCopy();
  const f = useFormat();
  const params = useLocalSearchParams<{ channel?: string }>();
  const user = session!.user;
  const [channel, setChannel] = useState<'email' | 'phone'>(params.channel === 'phone' ? 'phone' : 'email');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [info, setInfo] = useState('');
  const verified = channel === 'email' ? user.emailVerified : user.phoneVerified;
  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setInfo('');
    try {
      await task();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page>
      <Title verbatim>{copy('Verify your contact details', 'अपने संपर्क विवरण सत्यापित करें')}</Title>
      <Body verbatim>
        {copy(
          'A verified email or mobile number lets you send reports and ideas, book appointments, sign in with a code and recover your account.',
          'सत्यापित ईमेल या मोबाइल नंबर से आप रिपोर्ट और सुझाव भेज सकते हैं, मुलाकात बुक कर सकते हैं, कोड से लॉगिन कर सकते हैं और खाता वापस पा सकते हैं।',
        )}
      </Body>
      <Chips
        label={copy('Verify', 'सत्यापित करें')}
        value={channel}
        onChange={value => {
          setChannel(value);
          setCode('');
          setError(null);
        }}
        options={[
          { value: 'email', label: copy('Email', 'ईमेल') },
          { value: 'phone', label: copy('Mobile', 'मोबाइल') },
        ]}
      />
      <Card>
        <Text verbatim style={s.label}>
          {channel === 'email'
            ? user.email
            : (user.phone ?? copy('No mobile number added', 'मोबाइल नंबर नहीं जोड़ा गया'))}
        </Text>
        {verified ? (
          <Badge value="Confirmed" label={copy('Verified', 'सत्यापित')} />
        ) : (
          <Badge value="Requested" label={copy('Not verified', 'सत्यापित नहीं')} />
        )}
      </Card>
      {channel === 'phone' && !user.phone ? (
        <Button
          label={copy('Add a mobile number', 'मोबाइल नंबर जोड़ें')}
          onPress={() => router.push('/account')}
        />
      ) : (
        !verified && (
          <>
            <Button
              secondary
              disabled={busy}
              label={copy('Send a new code', 'नया कोड भेजें')}
              onPress={() =>
                void run(async () => {
                  await call('/auth/verify/request', { method: 'POST', body: { channel } });
                  setInfo(
                    channel === 'email'
                      ? copy(
                          'A code has been sent to your email. It is valid for 30 minutes.',
                          'आपके ईमेल पर कोड भेजा गया है। यह 30 मिनट तक मान्य है।',
                        )
                      : copy(
                          'A code has been sent by SMS. It is valid for 10 minutes.',
                          'SMS से कोड भेजा गया है। यह 10 मिनट तक मान्य है।',
                        ),
                  );
                })
              }
            />
            <Field
              label={copy('6-digit code', '6 अंकों का कोड')}
              value={code}
              onChangeText={v => setCode(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
              editable={!busy}
            />
            <Button
              disabled={busy || code.length !== 6}
              label={busy ? copy('Please wait…', 'कृपया प्रतीक्षा करें…') : copy('Verify', 'सत्यापित करें')}
              onPress={() =>
                void run(async () => {
                  const result = await call<{ user: Account }>('/auth/verify/confirm', {
                    method: 'POST',
                    body: { channel, code },
                  });
                  updateUser(result.user);
                  setCode('');
                  setInfo(copy('Verified. Thank you.', 'सत्यापित हो गया। धन्यवाद।'));
                })
              }
            />
          </>
        )
      )}
      {info ? <Notice>{info}</Notice> : null}
      {error ? <Notice error>{f.error(error)}</Notice> : null}
      <Button secondary label={copy('Done', 'पूरा हुआ')} onPress={() => router.dismissTo('/')} />
    </Page>
  );
}
export function AccountCard() {
  const { session, signOut } = useAuth();
  const router = useRouter();
  const copy = useCopy();
  const { language } = useLanguage();
  const f = useFormat();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const unverified = useNeedsVerification();
  if (!session)
    return (
      <Card>
        <Section verbatim>{copy('Your Batra Connect account', 'आपका बत्रा कनेक्ट खाता')}</Section>
        <Body verbatim>
          {copy(
            'Sign in to send reports, share ideas, book Jan Samvad and follow updates.',
            'रिपोर्ट भेजने, सुझाव देने, जन संवाद बुक करने और अपडेट देखने के लिए लॉगिन करें।',
          )}
        </Body>
        <Button
          label={copy('Sign in or create an account', 'लॉगिन करें या खाता बनाएँ')}
          onPress={() => router.push('/sign-in')}
        />
      </Card>
    );
  const user = session.user;
  return (
    <Card>
      <Section verbatim>{copy('Your Batra Connect account', 'आपका बत्रा कनेक्ट खाता')}</Section>
      <Text verbatim style={s.label}>
        {user.name}
      </Text>
      <Text verbatim style={s.small}>
        {user.email} · {roleLabel(user.role, language)}
      </Text>
      {unverified && (
        <>
          <Notice error>
            {copy(
              'Verify your email or mobile number to send reports and ideas.',
              'रिपोर्ट और सुझाव भेजने के लिए ईमेल या मोबाइल नंबर सत्यापित करें।',
            )}
          </Notice>
          <Button label={copy('Verify now', 'अभी सत्यापित करें')} onPress={() => router.push('/verify')} />
        </>
      )}
      <Row
        verbatim
        title={copy('Updates', 'अपडेट')}
        icon="notifications-outline"
        onPress={() => router.push('/updates')}
      />
      <Row
        verbatim
        title={copy('Account and security', 'खाता और सुरक्षा')}
        detail={copy('Name, mobile, password, devices, your data', 'नाम, मोबाइल, पासवर्ड, डिवाइस, आपका डेटा')}
        icon="shield-checkmark-outline"
        onPress={() => router.push('/account')}
      />
      <Row
        verbatim
        title={copy('Notification settings', 'सूचना सेटिंग')}
        icon="options-outline"
        onPress={() => router.push('/notification-settings')}
      />
      <Button
        secondary
        disabled={busy}
        label={copy('Sign out', 'लॉगआउट करें')}
        onPress={() => {
          setBusy(true);
          setError(null);
          void signOut()
            .then(() => router.dismissTo('/'))
            .catch(setError)
            .finally(() => setBusy(false));
        }}
      />
      {error ? <Notice error>{f.error(error)}</Notice> : null}
    </Card>
  );
}
export function AccountSettings() {
  return <Gate>{() => <AccountSettingsBody />}</Gate>;
}
function AccountSettingsBody() {
  const { session, call, updateUser, signOut } = useAuth();
  const router = useRouter();
  const copy = useCopy();
  const f = useFormat();
  const emailCodes = useEmailCodes();
  const user = session!.user;
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [email, setEmail] = useState(user.email);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [info, setInfo] = useState('');
  const sessions = useResource(
    () =>
      call<{
        sessions: {
          id: string;
          current: boolean;
          createdAt: string;
          lastUsedAt: string | null;
          device: string | null;
        }[];
      }>('/account/sessions'),
    [call],
  );
  async function run(name: string, task: () => Promise<void>) {
    setBusy(name);
    setError(null);
    setInfo('');
    try {
      await task();
    } catch (e) {
      setError(e);
    } finally {
      setBusy('');
    }
  }
  const emailChanged = email.trim().toLowerCase() !== user.email;
  async function exportData() {
    const data = await call<unknown>('/account/export');
    const text = JSON.stringify(data, null, 2);
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'batra-connect-account.json';
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const file = new File(Paths.cache, `batra-connect-account-${Date.now()}.json`);
    file.create();
    file.write(text);
    if (await Sharing.isAvailableAsync())
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: copy('Save your Batra Connect data', 'अपना बत्रा कनेक्ट डेटा सहेजें'),
      });
  }
  return (
    <Page>
      <Title verbatim>{copy('Account and security', 'खाता और सुरक्षा')}</Title>
      {error ? <Notice error>{f.error(error)}</Notice> : null}
      {info ? <Notice>{info}</Notice> : null}
      <Section verbatim>{copy('Profile', 'प्रोफ़ाइल')}</Section>
      <Field
        label={copy('Name', 'नाम')}
        value={name}
        onChangeText={setName}
        maxLength={100}
        autoComplete="name"
      />
      <Field
        label={copy('Mobile number', 'मोबाइल नंबर')}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        maxLength={16}
      />
      <Text verbatim style={s.small}>
        {phoneHint(copy)}{' '}
        {user.phone
          ? user.phoneVerified
            ? copy('Verified.', 'सत्यापित।')
            : copy('Not verified.', 'सत्यापित नहीं।')
          : ''}
      </Text>
      <Field
        label={copy('Email address', 'ईमेल पता')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        maxLength={254}
      />
      <Text verbatim style={s.small}>
        {user.emailVerified
          ? copy('Email verified.', 'ईमेल सत्यापित।')
          : copy('Email not verified.', 'ईमेल सत्यापित नहीं।')}
      </Text>
      {emailChanged && (
        <Field
          label={copy(
            'Current password (required to change email)',
            'वर्तमान पासवर्ड (ईमेल बदलने के लिए आवश्यक)',
          )}
          value={current}
          onChangeText={setCurrent}
          secureTextEntry
          autoComplete="current-password"
          maxLength={128}
        />
      )}
      <Button
        disabled={!!busy || name.trim().length < 2}
        label={
          busy === 'profile' ? copy('Saving…', 'सहेज रहे हैं…') : copy('Save profile', 'प्रोफ़ाइल सहेजें')
        }
        onPress={() =>
          void run('profile', async () => {
            const body: Record<string, unknown> = { name: name.trim() };
            const p = normalizePhone(phone.trim());
            if ((p || null) !== (user.phone ?? null)) body.phone = p || null;
            if (emailChanged) {
              body.email = email.trim().toLowerCase();
              body.currentPassword = current;
            }
            const result = await call<{ user: Account }>('/account', { method: 'PATCH', body });
            updateUser(result.user);
            setCurrent('');
            setInfo(copy('Profile saved.', 'प्रोफ़ाइल सहेजी गई।'));
            if (emailChanged && emailCodes) router.push('/verify');
            else if (body.phone) router.push({ pathname: '/verify', params: { channel: 'phone' } });
          })
        }
      />
      {emailCodes && (!user.emailVerified || (user.phone && !user.phoneVerified)) && (
        <Button
          secondary
          label={copy('Verify contact details', 'संपर्क विवरण सत्यापित करें')}
          onPress={() => router.push('/verify')}
        />
      )}
      <Section verbatim>{copy('Change password', 'पासवर्ड बदलें')}</Section>
      <Field
        label={copy('Current password', 'वर्तमान पासवर्ड')}
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        autoComplete="current-password"
        maxLength={128}
      />
      <Field
        label={copy('New password', 'नया पासवर्ड')}
        value={next}
        onChangeText={setNext}
        secureTextEntry
        autoComplete="new-password"
        maxLength={128}
      />
      <Button
        secondary
        disabled={!!busy || !current || next.length < 12}
        label={
          busy === 'password' ? copy('Saving…', 'सहेज रहे हैं…') : copy('Change password', 'पासवर्ड बदलें')
        }
        onPress={() =>
          void run('password', async () => {
            await call('/account/password', {
              method: 'POST',
              body: { currentPassword: current, newPassword: next },
            });
            setCurrent('');
            setNext('');
            setInfo(
              copy(
                'Password changed. Other devices were signed out.',
                'पासवर्ड बदला गया। अन्य डिवाइस से लॉगआउट हो गया।',
              ),
            );
            await sessions.reload(true);
          })
        }
      />
      <Section verbatim>{copy('Signed-in devices', 'लॉगिन किए गए डिवाइस')}</Section>
      <Loading busy={sessions.loading && !sessions.data} error={sessions.error} />
      {sessions.data?.sessions.map(item => (
        <Card key={item.id}>
          <Text verbatim style={s.label}>
            {item.device?.slice(0, 80) || copy('Unknown device', 'अज्ञात डिवाइस')}
          </Text>
          <Text verbatim style={s.small}>
            {copy('Last used', 'अंतिम उपयोग')}: {f.date(item.lastUsedAt ?? item.createdAt)}
          </Text>
          {item.current && <Badge value="active" label={copy('This device', 'यह डिवाइस')} />}
        </Card>
      ))}
      {(sessions.data?.sessions.length ?? 0) > 1 && (
        <Button
          secondary
          disabled={!!busy}
          label={copy('Sign out all other devices', 'अन्य सभी डिवाइस से लॉगआउट करें')}
          onPress={() =>
            void run('sessions', async () => {
              await call('/account/sessions/revoke-others', { method: 'POST' });
              await sessions.reload(true);
            })
          }
        />
      )}
      <Section verbatim>{copy('Your data', 'आपका डेटा')}</Section>
      <Body verbatim>
        {copy(
          'Download a copy of your account, reports, ideas, appointments and notifications.',
          'अपने खाते, रिपोर्ट, सुझाव, मुलाकात और सूचनाओं की प्रति डाउनलोड करें।',
        )}
      </Body>
      <Button
        secondary
        disabled={!!busy}
        label={
          busy === 'export'
            ? copy('Preparing…', 'तैयार कर रहे हैं…')
            : copy('Download my data', 'मेरा डेटा डाउनलोड करें')
        }
        onPress={() => void run('export', exportData)}
      />
      {user.role === 'citizen' &&
        (confirmDelete ? (
          <Card>
            <Section verbatim>{copy('Delete your account?', 'खाता हटाएँ?')}</Section>
            <Body verbatim>
              {copy(
                'Your name, email, mobile number, sessions, notifications and preferences are removed and you are signed out everywhere. Reports you sent stay with the office without your identity so work already under way can finish. Upcoming appointments are cancelled. This cannot be undone.',
                'आपका नाम, ईमेल, मोबाइल नंबर, सत्र, सूचनाएँ और पसंद हटा दी जाएँगी और हर जगह लॉगआउट हो जाएगा। भेजी गई रिपोर्ट आपकी पहचान के बिना कार्यालय के पास रहेंगी ताकि चल रहा कार्य पूरा हो सके। आगामी मुलाकातें रद्द होंगी। इसे वापस नहीं किया जा सकता।',
              )}
            </Body>
            <Field
              label={copy('Password', 'पासवर्ड')}
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              autoComplete="current-password"
              maxLength={128}
            />
            <Button
              disabled={!!busy || !deletePassword}
              label={
                busy === 'delete'
                  ? copy('Deleting…', 'हटा रहे हैं…')
                  : copy('Permanently delete account', 'खाता स्थायी रूप से हटाएँ')
              }
              onPress={() =>
                void run('delete', async () => {
                  await call('/account', {
                    method: 'DELETE',
                    body: { password: deletePassword, confirm: 'DELETE' },
                  });
                  // The server has already ended every session and removed this device's push token.
                  await signOut(false);
                  router.dismissTo('/');
                })
              }
            />
            <Button
              secondary
              disabled={!!busy}
              label={copy('Keep my account', 'खाता रखें')}
              onPress={() => {
                setConfirmDelete(false);
                setDeletePassword('');
              }}
            />
          </Card>
        ) : (
          <Button
            secondary
            label={copy('Delete account', 'खाता हटाएँ')}
            onPress={() => setConfirmDelete(true)}
          />
        ))}
    </Page>
  );
}
export function NotificationSettings() {
  return <Gate>{() => <NotificationSettingsBody />}</Gate>;
}
function NotificationSettingsBody() {
  const { session, call, registerPush } = useAuth();
  const copy = useCopy();
  const user = session!.user;
  const prefs = useResource(
    () => call<{ preferences: { push: boolean; email: boolean; sms: boolean } }>('/notification-preferences'),
    [call],
  );
  const device = useResource<PushState>(() => pushState(), []);
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  async function save(change: Partial<{ push: boolean; email: boolean; sms: boolean }>) {
    setSaving(true);
    setError(null);
    try {
      const result = await call<{ preferences: { push: boolean; email: boolean; sms: boolean } }>(
        '/notification-preferences',
        { method: 'PUT', body: change },
      );
      prefs.setData(result);
      if (change.push) await registerPush(true);
      await device.reload(true);
    } catch (e) {
      setError(e);
    } finally {
      setSaving(false);
    }
  }
  const p = prefs.data?.preferences;
  const state = device.data;
  const deviceNote: Record<PushState, string> = {
    granted: copy('Notifications are allowed on this device.', 'इस डिवाइस पर सूचनाएँ अनुमत हैं।'),
    denied: copy(
      'Notifications are blocked for Batra Connect in your phone settings.',
      'फ़ोन सेटिंग में बत्रा कनेक्ट की सूचनाएँ बंद हैं।',
    ),
    undetermined: copy(
      'Turn on push updates to allow notifications on this device.',
      'इस डिवाइस पर सूचनाएँ अनुमति देने के लिए पुश अपडेट चालू करें।',
    ),
    unsupported: copy(
      'Push notifications need the Android or iOS app on a phone.',
      'पुश सूचनाओं के लिए फ़ोन पर Android या iOS ऐप चाहिए।',
    ),
    unconfigured: copy(
      'Push notifications are not configured in this build.',
      'इस बिल्ड में पुश सूचनाएँ कॉन्फ़िगर नहीं हैं।',
    ),
  };
  return (
    <Page>
      <Title verbatim>{copy('Notification settings', 'सूचना सेटिंग')}</Title>
      <Body verbatim>
        {copy(
          'Updates always appear in the app. Choose where else you receive them.',
          'अपडेट हमेशा ऐप में दिखते हैं। चुनें कि आपको और कहाँ मिलें।',
        )}
      </Body>
      <Loading busy={prefs.loading && !p} error={prefs.error ?? error} onRetry={() => void prefs.reload()} />
      {p && (
        <>
          <Toggle
            label={copy('Push notifications', 'पुश सूचनाएँ')}
            detail={state ? deviceNote[state] : undefined}
            value={p.push}
            disabled={saving}
            onChange={value => void save({ push: value })}
          />
          <Toggle
            label={copy('Email', 'ईमेल')}
            detail={
              user.emailVerified
                ? user.email
                : copy(
                    'Verify your email to receive updates there.',
                    'वहाँ अपडेट पाने के लिए ईमेल सत्यापित करें।',
                  )
            }
            value={p.email}
            disabled={saving}
            onChange={value => void save({ email: value })}
          />
          <Toggle
            label={copy('SMS', 'SMS')}
            detail={
              user.phoneVerified
                ? (user.phone ?? '')
                : copy(
                    'Add and verify a mobile number to receive SMS.',
                    'SMS पाने के लिए मोबाइल नंबर जोड़ें और सत्यापित करें।',
                  )
            }
            value={p.sms}
            disabled={saving}
            onChange={value => void save({ sms: value })}
          />
        </>
      )}
      <Notice>
        {copy(
          'Sign-in and verification codes are always sent, whatever you choose here.',
          'लॉगिन और सत्यापन कोड हमेशा भेजे जाते हैं, चाहे आप यहाँ कुछ भी चुनें।',
        )}
      </Notice>
    </Page>
  );
}
