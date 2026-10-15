import { PublishedEntries } from './ContentScreens';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Pressable } from '@/components/pressable';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, useLanguage } from './language';
import { FitImage, Body, Button, Card, C, Field, Page, Row, Section, Title, s } from './ui';
import { achievementContent } from './content/achievements';
import { publicationImages } from './content/achievement-assets';
import { galleryPhotos, photoAlbums, photosForAlbum } from './content/achievement-gallery';

export type AchievementScope = 'mla' | 'minister';
const inScope = (category: string, scope?: AchievementScope) =>
  !scope ||
  (scope === 'minister'
    ? ['transport', 'technology'].includes(category)
    : ['service', 'development', 'community'].includes(category));
type Category = 'all' | 'service' | 'transport' | 'development' | 'technology' | 'community';
const categories: { id: Category; en: string; hi: string }[] = [
  { id: 'all', en: 'All', hi: 'सभी' },
  { id: 'service', en: 'Public service', hi: 'जनसेवा' },
  { id: 'transport', en: 'Transport', hi: 'परिवहन' },
  { id: 'development', en: 'Development', hi: 'विकास' },
  { id: 'technology', en: 'Technology', hi: 'प्रौद्योगिकी' },
  { id: 'community', en: 'Community', hi: 'समुदाय' },
];
const storyPhotos: Record<string, number> = {
  women: require('../assets/achievements/photo-women.jpg'),
  keshav: require('../assets/achievements/photo-park.jpg'),
  stadium: require('../assets/achievements/photo-stadium.jpg'),
  tehsil: require('../assets/achievements/photo-tehsil.jpg'),
};
export function AchievementHighlights() {
  const router = useRouter();
  const { language } = useLanguage();
  return (
    <Card>
      <Section>{language === 'hi' ? 'रुड़की विधायक · जनसेवा' : 'Roorkee MLA · Public service'}</Section>
      <View style={a.statGrid}>
        {achievementContent.stats
          .filter(stat => ['ration', 'old-age', 'assistance'].includes(stat.id))
          .map(stat => (
            <View key={stat.id} style={a.highlight}>
              <Text verbatim style={a.value}>
                {stat.value}
              </Text>
              <Text verbatim style={s.small}>
                {stat.label[language]}
              </Text>
            </View>
          ))}
      </View>
      <Button
        label={language === 'hi' ? 'रुड़की विधायक के कार्य देखें' : 'Explore Roorkee MLA work'}
        icon="arrow-forward-outline"
        onPress={() => router.push('/roorkee')}
      />
      <Row
        verbatim
        title={
          language === 'hi' ? 'कैबिनेट मंत्री · विभागीय कार्य' : 'Cabinet Minister · Department initiatives'
        }
        detail={
          language === 'hi'
            ? 'परिवहन, आईटी, विज्ञान और जैव प्रौद्योगिकी'
            : 'Transport, IT, science and biotechnology'
        }
        icon="briefcase-outline"
        onPress={() => router.push('/ministries')}
      />
    </Card>
  );
}
export function Achievements({
  projectsOnly = false,
  scope,
}: {
  projectsOnly?: boolean;
  scope?: AchievementScope;
}) {
  const router = useRouter();
  const { language } = useLanguage();
  const [category, setCategory] = useState<Category>(projectsOnly ? 'development' : 'all');
  const [query, setQuery] = useState('');
  const text = (en: string, hi: string) => (language === 'hi' ? hi : en);
  const matches = (item: { category: string }, content: string) =>
    inScope(item.category, scope) &&
    (category === 'all' || item.category === category) &&
    content.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  const stats = achievementContent.stats.filter(item =>
    matches(item, `${item.label.en} ${item.label.hi} ${item.value}`),
  );
  const records = achievementContent.records.filter(item =>
    matches(item, `${item.title.en} ${item.title.hi} ${item.description.en} ${item.description.hi}`),
  );
  return (
    <Page>
      <Text verbatim style={s.badge}>
        {scope === 'mla'
          ? text('ROORKEE CONSTITUENCY', 'रुड़की विधानसभा क्षेत्र')
          : scope === 'minister'
            ? text('CABINET MINISTER', 'कैबिनेट मंत्री')
            : text('ACHIEVEMENTS', 'उपलब्धियाँ')}
      </Text>
      <Title verbatim>
        {projectsOnly
          ? text('Roorkee development projects', 'रुड़की की विकास परियोजनाएँ')
          : scope === 'mla'
            ? text('Pradeep Batra · MLA, Roorkee', 'प्रदीप बत्रा · विधायक, रुड़की')
            : scope === 'minister'
              ? text('Ministerial responsibilities', 'मंत्री के विभागीय कार्य')
              : text('One representative. Two responsibilities.', 'एक जनप्रतिनिधि। दो जिम्मेदारियाँ।')}
      </Title>
      <Body verbatim>
        {text(
          'Discover public service, development and moments from the community.',
          'जनसेवा, विकास और समुदाय की झलकियाँ देखें।',
        )}
      </Body>
      {scope ? (
        <PublishedEntries
          type="profile"
          slug={scope === 'mla' ? 'mla-roorkee' : 'minister'}
          heading={text('Latest from the office', 'कार्यालय से नवीनतम')}
        />
      ) : null}
      <PublishedEntries
        type={projectsOnly ? 'project' : 'achievement'}
        heading={
          projectsOnly
            ? text('Project updates from the office', 'कार्यालय से परियोजना अपडेट')
            : text('Recent achievements', 'हाल की उपलब्धियाँ')
        }
      />
      {!projectsOnly && !scope ? (
        <PublishedEntries type="photo" heading={text('New photos', 'नई फोटो')} limit={6} />
      ) : null}
      {scope ? (
        <Body verbatim>
          {scope === 'mla'
            ? text(
                'Constituency development, service-centre support, Assembly representation and community work. ',
                'विधानसभा क्षेत्र का विकास, सेवा केंद्र का सहयोग, विधानसभा में प्रतिनिधित्व और सामुदायिक कार्य। ',
              )
            : text(
                'Department-level initiatives in transport, IT and good governance, science and technology, and biotechnology.',
                'परिवहन, आईटी व सुशासन, विज्ञान व प्रौद्योगिकी और जैव प्रौद्योगिकी की विभागीय पहल।',
              )}
        </Body>
      ) : (
        <>
          <Row
            verbatim
            title={text('MLA of Roorkee', 'रुड़की के विधायक')}
            detail={text(
              'Local development, public service & constituency representation',
              'स्थानीय विकास, जनसेवा और विधानसभा क्षेत्र का प्रतिनिधित्व',
            )}
            icon="location-outline"
            onPress={() => router.push('/roorkee')}
          />
          <Row
            verbatim
            title={text('Cabinet Minister', 'कैबिनेट मंत्री')}
            detail={text(
              'Department responsibilities & statewide initiatives',
              'विभागीय जिम्मेदारियाँ और राज्यस्तरीय पहल',
            )}
            icon="briefcase-outline"
            onPress={() => router.push('/ministries')}
          />
        </>
      )}
      {scope === 'minister' && (
        <>
          <Section verbatim>{text('Departments', 'विभाग')}</Section>
          {[
            ['transport', 'Transport', 'परिवहन'],
            ['it', 'IT & good governance', 'आईटी और सुशासन'],
            ['science', 'Science & technology', 'विज्ञान और प्रौद्योगिकी'],
            ['biotechnology', 'Biotechnology', 'जैव प्रौद्योगिकी'],
          ].map(([id, en, hi]) => (
            <Row
              verbatim
              key={id}
              title={text(en, hi)}
              detail={text('Department guide and public services', 'विभाग की जानकारी और सार्वजनिक सेवाएँ')}
              icon="grid-outline"
              onPress={() => router.push({ pathname: '/service/[id]', params: { id } })}
            />
          ))}
        </>
      )}
      {(() => {
        const hero = publicationImages.find(
          item => item.id === (scope === 'minister' ? 'image-112' : 'image-167'),
        )!;
        return (
          <FitImage
            source={hero.source}
            ratio={hero.width / hero.height}
            label={
              scope === 'minister'
                ? text(
                    'Pradeep Batra visiting a biotechnology laboratory',
                    'जैव प्रौद्योगिकी प्रयोगशाला का निरीक्षण करते प्रदीप बत्रा',
                  )
                : text(
                    'Pradeep Batra meeting residents at the service centre',
                    'सेवा केंद्र में नागरिकों से मिलते प्रदीप बत्रा',
                  )
            }
            maxHeight={520}
          />
        );
      })()}
      <Row
        verbatim
        title={text('Photo gallery', 'चित्र गैलरी')}
        detail={text(
          'Public service, project visits and community moments',
          'जनसेवा, परियोजना निरीक्षण और समुदाय की झलकियाँ',
        )}
        icon="images-outline"
        onPress={() => router.push('/gallery')}
      />
      <Field
        label={text('Search achievements', 'उपलब्धियाँ खोजें')}
        value={query}
        onChangeText={setQuery}
        placeholder={text('Ration, bridge, budget, locality…', 'राशन, पुल, बजट, स्थान…')}
        maxLength={100}
      />
      <View style={a.filters}>
        {categories
          .filter(item => item.id === 'all' || inScope(item.id, scope))
          .map(item => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected: category === item.id }}
              onPress={() => setCategory(item.id)}
              style={({ pressed }) => [
                a.chip,
                category === item.id && a.chipActive,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text verbatim style={[s.label, category === item.id && { color: C.white }]}>
                {item[language]}
              </Text>
            </Pressable>
          ))}
      </View>
      <Text verbatim accessibilityLiveRegion="polite" style={s.small}>
        {text(
          `${stats.length} figures · ${records.length} stories`,
          `${stats.length} आंकड़े · ${records.length} विवरण`,
        )}
      </Text>
      {stats.length > 0 && (
        <>
          <Section verbatim>{text('By the numbers', 'आंकड़ों में उपलब्धियाँ')}</Section>
          <View style={a.statGrid}>
            {stats.map(stat => (
              <View key={stat.id} style={a.stat}>
                <Text verbatim selectable style={a.value}>
                  {stat.value}
                </Text>
                <Text verbatim style={s.label}>
                  {stat.label[language]}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
      {records.length > 0 && (
        <Section verbatim>{text('Projects & public service', 'परियोजनाएँ और जनसेवा')}</Section>
      )}
      {records.map(record => (
        <Card key={record.id}>
          {(() => {
            const photo = galleryPhotos.find(item => item.pages.includes(record.pages[0]));
            return photo || storyPhotos[record.id] ? (
              <FitImage
                source={storyPhotos[record.id] ?? photo!.source}
                ratio={storyPhotos[record.id] ? undefined : photo!.width / photo!.height}
                label={record.title[language]}
                maxHeight={520}
              />
            ) : null;
          })()}
          <Text verbatim style={s.badge}>
            {record.status[language]}
          </Text>
          <Section verbatim>{record.title[language]}</Section>
          <Body verbatim>{record.description[language]}</Body>
        </Card>
      ))}
      {!stats.length && !records.length && (
        <Card>
          <Section verbatim>{text('No matching achievements', 'कोई उपलब्धि नहीं मिली')}</Section>
          <Button
            secondary
            label={text('Show all achievements', 'सभी उपलब्धियाँ देखें')}
            onPress={() => {
              setQuery('');
              setCategory('all');
            }}
          />
        </Card>
      )}
      {scope !== 'minister' && !projectsOnly && !query && category === 'all' && (
        <>
          <Section verbatim>{text('Public-service journey', 'जनसेवा की यात्रा')}</Section>
          {achievementContent.timeline.map(item => (
            <Card key={item.year}>
              <Text verbatim style={a.value}>
                {item.year}
              </Text>
              <Body verbatim>{item.text[language]}</Body>
            </Card>
          ))}
        </>
      )}
    </Page>
  );
}
export function PublicationGallery() {
  const router = useRouter();
  const { language } = useLanguage();
  return (
    <Page>
      <Title verbatim>{language === 'hi' ? 'समुदाय की झलकियाँ' : 'Moments from the community'}</Title>
      <Body verbatim>
        {language === 'hi'
          ? 'जनसेवा, विकास और साथ मिलकर आगे बढ़ने की तस्वीरें।'
          : 'Public service, progress and people coming together.'}
      </Body>
      {photoAlbums.map(album => {
        const cover = photosForAlbum(album.page)[0];
        return cover ? (
          <Pressable
            key={album.page}
            accessibilityRole="button"
            accessibilityLabel={album[language]}
            onPress={() => router.push({ pathname: '/gallery/[page]', params: { page: String(album.page) } })}
            style={({ pressed }) => [a.galleryCard, pressed && { opacity: 0.7 }]}
          >
            <View style={{ padding: 12, paddingBottom: 0 }}>
              <FitImage
                source={cover.source}
                ratio={cover.width / cover.height}
                maxHeight={420}
                radius={12}
              />
            </View>
            <View style={{ padding: 16 }}>
              <Text verbatim style={s.section}>
                {album[language]}
              </Text>
            </View>
          </Pressable>
        ) : null;
      })}
    </Page>
  );
}
export function PublicationPage() {
  const { page } = useLocalSearchParams<{ page: string }>();
  return <PhotoAlbum page={Number(page)} />;
}
function PhotoAlbum({ page }: { page: number }) {
  const router = useRouter();
  const { language } = useLanguage();
  const album = photoAlbums.find(item => item.page === page);
  const photos = photosForAlbum(page);
  const title = album?.[language] ?? (language === 'hi' ? 'समुदाय की झलकियाँ' : 'Community moments');
  return (
    <Page>
      <Title verbatim>{title}</Title>
      {photos.map((photo, index) => (
        <Pressable
          key={photo.id}
          accessibilityRole="button"
          accessibilityLabel={
            language === 'hi' ? `${title} · चित्र ${index + 1} खोलें` : `Open ${title} photo ${index + 1}`
          }
          onPress={() => router.push({ pathname: '/photo/[id]', params: { id: photo.id } })}
          style={({ pressed }) => [a.galleryCard, pressed && { opacity: 0.7 }]}
        >
          <View style={{ padding: 12 }}>
            <FitImage source={photo.source} ratio={photo.width / photo.height} maxHeight={560} radius={12} />
          </View>
        </Pressable>
      ))}
      {!photos.length && (
        <Body verbatim>
          {language === 'hi' ? 'इस संग्रह में कोई चित्र नहीं है।' : 'No photos in this collection.'}
        </Body>
      )}
      <Button
        secondary
        label={language === 'hi' ? 'सभी संग्रह देखें' : 'Browse all collections'}
        onPress={() => router.replace('/gallery')}
      />
    </Page>
  );
}
export function PhotoDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const photo = galleryPhotos.find(item => item.id === id);
  const { language } = useLanguage();
  const { width } = useWindowDimensions();
  const [zoom, setZoom] = useState(false);
  if (!photo)
    return (
      <Page>
        <Title verbatim>{language === 'hi' ? 'चित्र उपलब्ध नहीं' : 'Photo unavailable'}</Title>
      </Page>
    );
  const album = photoAlbums.find(item => photo.pages.some(page => item.pages.includes(page)));
  const title = album?.[language] ?? (language === 'hi' ? 'समुदाय की झलकियाँ' : 'Community moments');
  const imageWidth = Math.min(width, 700) - 48;
  return (
    <Page>
      <Title verbatim>{title}</Title>
      <Button
        secondary
        label={
          zoom
            ? language === 'hi'
              ? 'स्क्रीन में फिट करें'
              : 'Fit to screen'
            : language === 'hi'
              ? 'चित्र बड़ा करें'
              : 'Enlarge photo'
        }
        onPress={() => setZoom(!zoom)}
      />
      <ScrollView horizontal style={{ flexGrow: 0 }}>
        <Image
          source={photo.source}
          accessibilityLabel={title}
          style={{
            width: imageWidth * (zoom ? 2 : 1),
            height: (imageWidth * (zoom ? 2 : 1) * photo.height) / photo.width,
          }}
          resizeMode="contain"
        />
      </ScrollView>
    </Page>
  );
}
const a = StyleSheet.create({
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  highlight: { flex: 1, minWidth: 140, gap: 6 },
  stat: {
    flexGrow: 1,
    flexBasis: 250,
    padding: 20,
    gap: 12,
    borderRadius: 20,
    backgroundColor: C.white,
    borderColor: C.border,
    borderWidth: 1,
  },
  value: { fontSize: 28, lineHeight: 38, fontWeight: '800', color: C.blue },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: C.pale,
  },
  chipActive: { backgroundColor: C.navy },
  galleryCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: C.white,
    borderColor: C.border,
    borderWidth: 1,
  },
  navigation: { flexDirection: 'row', gap: 12 },
});
