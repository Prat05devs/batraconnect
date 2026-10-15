import React from 'react';
import { Linking, View } from 'react-native';
import { api, API_BASE } from './auth';
import type { ContentEntry, ContentType } from './api-client';
import { Text, useLanguage } from './language';
import { useCopy, useFormat, useResource } from './connected-ui';
import { Body, Button, Card, FitImage, Section, s } from './ui';
/**
 * Office-published entries (announcements, projects, profiles, photos) shown above bundled content.
 * Renders nothing offline or when nothing is published, so the app's built-in content remains the fallback.
 */
export function PublishedEntries({
  type,
  limit = 20,
  heading,
  slug,
}: {
  type: ContentType;
  limit?: number;
  heading?: string;
  slug?: string;
}) {
  const { language } = useLanguage();
  const copy = useCopy();
  const f = useFormat();
  const list = useResource(
    () => api<{ entries: ContentEntry[] }>(`/content?type=${type}`).then(r => r.entries),
    [type],
    300000,
  );
  const entries = (list.data ?? []).filter(e => !slug || e.slug === slug).slice(0, limit);
  if (!entries.length) return null;
  const pick = (b: { en: string; hi?: string } | null) =>
    b ? (language === 'hi' && b.hi ? b.hi : b.en) : '';
  return (
    <View style={{ gap: 12 }}>
      {heading ? <Section verbatim>{heading}</Section> : null}
      {entries.map(e => (
        <Card key={e.id}>
          <Text verbatim style={s.rowTitle}>
            {pick(e.title)}
          </Text>
          {e.mediaIds.map(id => (
            <FitImage
              key={id}
              source={{ uri: `${API_BASE}/api/v1/public/media/${id}` }}
              label={pick(e.title)}
              maxHeight={480}
              radius={12}
            />
          ))}
          {e.summary ? <Body verbatim>{pick(e.summary)}</Body> : null}
          {e.body ? (
            <Text verbatim style={s.small}>
              {pick(e.body)}
            </Text>
          ) : null}
          {Object.entries(e.fields).map(([k, v]) => (
            <Text key={k} verbatim style={s.small}>
              <Text verbatim style={s.label}>
                {k}:{' '}
              </Text>
              {String(v ?? '')}
            </Text>
          ))}
          <Text verbatim style={s.small}>
            {copy('Published by the office', 'कार्यालय द्वारा प्रकाशित')}
            {e.publishedAt ? ` · ${f.date(e.publishedAt)}` : ''}
          </Text>
          {e.sourceUrl ? (
            <Button
              secondary
              icon="open-outline"
              label={copy('Official source', 'आधिकारिक स्रोत')}
              onPress={() => void Linking.openURL(e.sourceUrl!)}
            />
          ) : null}
        </Card>
      ))}
    </View>
  );
}
