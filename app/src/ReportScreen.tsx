import { Text, useLanguage } from './language';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, Linking, Platform, Image, View } from 'react-native';
import { Pressable } from '@/components/pressable';
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Location from 'expo-location';
import { useAuth } from './auth';
import { useNeedsVerification } from './app-config';
import { useSubmissions } from './submissions';
import { useStore } from './store';
import { useReferenceData } from './reference-data';
import { Picker, useCopy } from './connected-ui';
import { categories, districts, validateStep } from './model';
import { useRouter, useNavigation } from 'expo-router';
import { Button, Body, Card, C, Field, Icon, Notice, Page, Row, Title, s } from './ui';
const steps = ['Category', 'Details', 'Evidence', 'Location', 'Review'];
export function ReportScreen() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const navigation = useNavigation();
  const copy = useCopy();
  const { draft, updateDraft, saveReport } = useStore();
  const { send } = useSubmissions();
  const { wards } = useReferenceData();
  const { session } = useAuth();
  const [locating, setLocating] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const needsVerification = useNeedsVerification(),
    verified = !!session && !needsVerification;
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  useEffect(() => {
    const back = () => {
      if (saving.current) return true;
      if (step > 0) {
        setStep(value => value - 1);
        setError('');
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', back);
    navigation.setOptions({
      headerLeft: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Go back')}
          onPress={() => {
            if (!back()) router.back();
          }}
          style={{ minWidth: 48, minHeight: 48, justifyContent: 'center' }}
        >
          <Icon name="chevron-back" color={C.navy} />
        </Pressable>
      ),
    });
    return () => subscription.remove();
  }, [navigation, router, step, t]);
  async function photo(camera: boolean) {
    if (draft.photos.length >= 3) {
      setError('You can attach up to 3 photos. Remove one to add another.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError(
            'Camera access was not granted. You can choose a photo instead or continue without evidence.',
          );
          return;
        }
      }
      const result = camera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
      if (result.canceled) return;
      if (Platform.OS === 'web') {
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        if (blob.size > 5 * 1024 * 1024) {
          setError('Choose a photo smaller than 5 MB for the browser preview.');
          return;
        }
        const uri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        updateDraft({ photos: [...draft.photos, uri] });
        return;
      }
      const dir = new Directory(Paths.document, 'report-evidence');
      dir.create({ idempotent: true, intermediates: true });
      const file = new File(dir, `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
      new File(result.assets[0].uri).copy(file);
      updateDraft({ photos: [...draft.photos, file.uri] });
    } catch {
      setError('Photo could not be added. Try another photo or continue without evidence.');
    } finally {
      setBusy(false);
    }
  }
  function next() {
    const problem = validateStep(step, draft);
    setError(problem ?? '');
    if (problem) AccessibilityInfo.announceForAccessibility(problem);
    else setStep(value => value + 1);
  }
  async function submit() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      const report = await saveReport();
      router.replace({ pathname: '/confirmation', params: { id: report.id } });
    } catch {
      saving.current = false;
      setError('Your report could not be saved. Your draft is still here; please try again.');
    } finally {
      setBusy(false);
    }
  }
  /** Saves on the device first, then sends; without a connection it stays queued and sends automatically later. */
  async function submitConnected() {
    if (!session || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      const report = await saveReport();
      const result = await send(report);
      if (result.status === 'sent')
        router.replace({ pathname: '/submitted/[id]', params: { id: result.complaint.id } });
      else router.replace({ pathname: '/confirmation', params: { id: report.id, outcome: result.status } });
    } catch {
      saving.current = false;
      setError('Your report could not be saved. Your draft is still here; please try again.');
    } finally {
      setBusy(false);
    }
  }
  async function locate() {
    setLocating(true);
    setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError(
          copy(
            'Location access was not granted. You can still choose the district and describe the place.',
            'स्थान की अनुमति नहीं मिली। आप फिर भी जिला चुनकर स्थान लिख सकते हैं।',
          ),
        );
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const latitude = Math.round(position.coords.latitude * 1e6) / 1e6,
        longitude = Math.round(position.coords.longitude * 1e6) / 1e6;
      if (latitude < 28.7 || latitude > 31.5 || longitude < 77.5 || longitude > 81.1) {
        setError(
          copy(
            'Your current position appears to be outside Uttarakhand, so it was not added. Describe the location instead.',
            'आपका वर्तमान स्थान उत्तराखंड से बाहर लगता है, इसलिए नहीं जोड़ा गया। स्थान का विवरण लिखें।',
          ),
        );
        return;
      }
      setAccuracy(position.coords.accuracy ?? null);
      updateDraft({ latitude, longitude });
      if (!draft.locality.trim()) {
        const [place] = await Location.reverseGeocodeAsync({ latitude, longitude }).catch(() => []);
        const text = [place?.street, place?.district ?? place?.subregion, place?.city]
          .filter(Boolean)
          .join(', ');
        if (text) updateDraft({ locality: text.slice(0, 160) });
      }
    } catch {
      setError(
        copy(
          'Your location could not be found. Check that location services are on, or describe the place instead.',
          'आपका स्थान नहीं मिला। जाँचें कि लोकेशन चालू है, या स्थान का विवरण लिखें।',
        ),
      );
    } finally {
      setLocating(false);
    }
  }
  const headings = [
    'What needs attention?',
    'Tell us what happened',
    'Add a little context',
    'Where is the issue?',
    'Review your report',
  ];
  return (
    <Page>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {steps.map((name, i) => (
          <View
            key={name}
            accessibilityLabel={`${t(name)}, ${t(i < step ? 'completed' : i === step ? 'current step' : 'upcoming')}`}
            style={{ flex: 1, height: 5, backgroundColor: i <= step ? C.blue : C.border, borderRadius: 3 }}
          />
        ))}
      </View>
      <Text style={s.small}>
        {t(`STEP ${step + 1} OF 5`)} · {steps[step]}
      </Text>
      <Title>{headings[step]}</Title>
      {step === 0 && (
        <>
          <Body>Choose the category that best describes your problem.</Body>
          {categories.map(c => (
            <Row
              key={c.name}
              title={c.name}
              detail={c.detail}
              icon={c.icon}
              color={c.color}
              tint={c.tint}
              selected={draft.category === c.name}
              onPress={() => updateDraft({ category: c.name })}
            />
          ))}
        </>
      )}
      {step === 1 && (
        <>
          <Body>A few clear details will help explain the issue.</Body>
          <Field
            label="Issue title"
            value={draft.title}
            onChangeText={title => updateDraft({ title })}
            maxLength={100}
            placeholder="e.g. Damaged road near the bus stop"
          />
          <Field
            label="Description"
            value={draft.description}
            onChangeText={description => updateDraft({ description })}
            maxLength={1000}
            multiline
            placeholder="What happened? How is it affecting your area?"
          />
          <Text style={s.small}>{draft.description.length}/1000 characters</Text>
          <Notice>Please leave out passwords, ID numbers, and other sensitive personal information.</Notice>
        </>
      )}
      {step === 2 && (
        <>
          <Body>Photos are optional. Attach up to 3 to help show the problem.</Body>
          <Button
            label="Choose a photo"
            secondary
            disabled={busy || draft.photos.length >= 3}
            icon="images-outline"
            onPress={() => {
              void photo(false);
            }}
          />
          <Button
            label="Take a photo"
            secondary
            disabled={busy || draft.photos.length >= 3}
            icon="camera-outline"
            onPress={() => {
              void photo(true);
            }}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {draft.photos.map((uri, i) => (
              <View key={uri} style={{ gap: 8 }}>
                <Image
                  source={{ uri }}
                  accessibilityLabel={t(`Evidence photo ${i + 1}`)}
                  style={{ width: 132, height: 132, borderRadius: 14 }}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t(`Remove photo ${i + 1}`)}
                  onPress={() => updateDraft({ photos: draft.photos.filter(p => p !== uri) })}
                  style={({ pressed }) => ({
                    minHeight: 48,
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text style={{ color: C.red }}>Remove photo</Text>
                </Pressable>
              </View>
            ))}
          </View>
          <Notice>
            Photos stay on this device when you save locally. Sending a report uploads its attached photos to
            Batra Connect.
          </Notice>
        </>
      )}
      {step === 3 && (
        <>
          <Body>
            {copy(
              'Choose the district, add a landmark, and share your position if you are at the spot.',
              'जिला चुनें, कोई पहचान चिह्न लिखें, और यदि आप वहीं हैं तो अपना स्थान साझा करें।',
            )}
          </Body>
          <Picker
            label={copy('District', 'जिला')}
            value={
              districts.find(d => d.name.toLowerCase() === draft.district.trim().toLowerCase())?.name ?? ''
            }
            onChange={district =>
              updateDraft({ district, ...(district !== 'Haridwar' ? { wardId: undefined } : {}) })
            }
            placeholder={draft.district.trim() || copy('Choose a district', 'जिला चुनें')}
            icon="location-outline"
            options={districts.map(d => ({ value: d.name, label: language === 'hi' ? d.hi : d.name }))}
          />
          {draft.district === 'Haridwar' && (
            <Picker
              label={copy(
                'Roorkee ward (if the issue is in Roorkee)',
                'रुड़की वार्ड (यदि समस्या रुड़की में है)',
              )}
              value={draft.wardId ?? ''}
              onChange={wardId => updateDraft({ wardId: wardId || undefined })}
              placeholder={copy('Not in Roorkee / not sure', 'रुड़की में नहीं / पता नहीं')}
              icon="map-outline"
              options={[
                { value: '', label: copy('Not in Roorkee / not sure', 'रुड़की में नहीं / पता नहीं') },
                ...wards.map(w => ({
                  value: w.id,
                  label: language === 'hi' && w.hindiName ? w.hindiName : w.name,
                  detail: w.localities.slice(0, 3).join(', ') || undefined,
                })),
              ]}
            />
          )}
          <Field
            label="Locality / landmark"
            value={draft.locality}
            onChangeText={locality => updateDraft({ locality })}
            maxLength={160}
            placeholder="e.g. Near Roorkee bus stand"
          />
          <Card>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Icon name="navigate-outline" size={28} />
              <Text verbatim style={[s.label, { flex: 1 }]}>
                {draft.latitude !== undefined
                  ? copy('Your position is attached', 'आपका स्थान जुड़ा है')
                  : copy('At the spot? Add your exact position', 'वहीं हैं? सटीक स्थान जोड़ें')}
              </Text>
            </View>
            {draft.latitude !== undefined ? (
              <>
                <Text verbatim style={s.small}>
                  {draft.latitude.toFixed(5)}, {draft.longitude?.toFixed(5)}
                  {accuracy
                    ? copy(
                        ` · accurate to about ${Math.round(accuracy)} m`,
                        ` · लगभग ${Math.round(accuracy)} मी. तक सटीक`,
                      )
                    : ''}
                </Text>
                <Button
                  secondary
                  icon="map-outline"
                  label={copy('Check it on the map', 'मानचित्र पर देखें')}
                  onPress={() =>
                    void Linking.openURL(
                      `https://www.google.com/maps/search/?api=1&query=${draft.latitude},${draft.longitude}`,
                    )
                  }
                />
                <Button
                  secondary
                  label={copy('Remove position', 'स्थान हटाएँ')}
                  onPress={() => updateDraft({ latitude: undefined, longitude: undefined })}
                />
              </>
            ) : (
              <>
                <Text verbatim style={s.small}>
                  {copy(
                    'This helps the field officer find the exact place. It is shared only with the office handling your report.',
                    'इससे फील्ड अधिकारी सटीक स्थान ढूँढ पाते हैं। यह केवल आपकी रिपोर्ट संभालने वाले कार्यालय को दिखता है।',
                  )}
                </Text>
                <Button
                  secondary
                  icon="locate-outline"
                  disabled={locating}
                  label={
                    locating
                      ? copy('Finding your position…', 'स्थान ढूँढ रहे हैं…')
                      : copy('Use my current location', 'मेरा वर्तमान स्थान उपयोग करें')
                  }
                  onPress={() => void locate()}
                />
              </>
            )}
          </Card>
        </>
      )}
      {step === 4 && (
        <>
          <Body>Review the information before saving or sending.</Body>
          {[
            { label: 'Category', value: draft.category, target: 0 },
            { label: 'Issue details', value: `${draft.title}\n\n${draft.description}`, target: 1 },
            {
              label: 'Evidence',
              value: `${draft.photos.length} photo${draft.photos.length === 1 ? '' : 's'} attached`,
              target: 2,
            },
            {
              label: 'Location',
              value: `${draft.locality}, ${draft.district}${draft.wardId ? ` · ${wards.find(w => w.id === draft.wardId)?.name ?? ''}` : ''}${draft.latitude !== undefined ? ` · ${copy('GPS attached', 'GPS जुड़ा')}` : ''}`,
              target: 3,
            },
          ].map(item => (
            <Card key={item.label}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={s.label}>{item.label}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t('Edit')} ${t(item.label)}`}
                  disabled={busy}
                  onPress={() => setStep(item.target)}
                  style={({ pressed }) => ({ padding: 12, minHeight: 48, opacity: pressed ? 0.6 : 1 })}
                >
                  <Text style={{ color: C.blue, fontWeight: '600' }}>Edit</Text>
                </Pressable>
              </View>
              <Body verbatim={item.label === 'Issue details' || item.label === 'Location'}>{item.value}</Body>
            </Card>
          ))}
          <Notice>
            Save locally keeps this report on your device. Send to Batra Connect gives you a receipt and lets
            you follow updates.
          </Notice>
          {session && (
            <Text verbatim style={s.small}>
              {copy(
                'No connection? Sending still works: the report is kept safely and goes automatically when you are back online.',
                'कनेक्शन नहीं? फिर भी भेजें: रिपोर्ट सुरक्षित रहेगी और ऑनलाइन होते ही अपने आप चली जाएगी।',
              )}
            </Text>
          )}
        </>
      )}
      {step === 4 &&
        (session ? (
          verified ? (
            <Button
              disabled={busy}
              label={busy ? 'Sending…' : 'Send to Batra Connect'}
              onPress={() => {
                void submitConnected();
              }}
            />
          ) : (
            <>
              <Notice error>
                {copy(
                  'Verify your email or mobile number to send reports. Your draft stays here.',
                  'रिपोर्ट भेजने के लिए ईमेल या मोबाइल नंबर सत्यापित करें। आपका ड्राफ्ट यहीं रहेगा।',
                )}
              </Notice>
              <Button
                secondary
                label={copy('Verify now', 'अभी सत्यापित करें')}
                onPress={() => router.push('/verify')}
              />
            </>
          )
        ) : !session ? (
          <Button
            secondary
            disabled={busy}
            label="Sign in to send this report"
            onPress={() => router.push('/sign-in')}
          />
        ) : null)}
      {error ? <Notice error>{error}</Notice> : null}
      <Button
        disabled={busy}
        label={
          busy
            ? 'Please wait…'
            : step === 4
              ? 'Save local report'
              : step === 2 && !draft.photos.length
                ? 'Continue without photos'
                : 'Continue'
        }
        icon={step === 4 ? 'checkmark' : 'arrow-forward'}
        onPress={
          step === 4
            ? () => {
                void submit();
              }
            : next
        }
      />
      {step > 0 && (
        <Button
          secondary
          disabled={busy}
          label="Previous step"
          onPress={() => {
            setError('');
            setStep(value => value - 1);
          }}
        />
      )}
      <Text style={[s.small, { textAlign: 'center' }]}>
        Your draft is automatically saved on this device.
      </Text>
    </Page>
  );
}
