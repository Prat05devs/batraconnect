import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { achievementContent } from '../src/content/achievements.ts';
const manifest = JSON.parse(readFileSync(new URL('../assets/achievements/manifest.json', import.meta.url)));
test('every photo is bundled offline; full page scans and source citations are not shipped', () => {
  for (let page = 1; page <= 44; page++)
    assert.ok(
      !existsSync(
        new URL(`../assets/achievements/page-${String(page).padStart(2, '0')}.jpg`, import.meta.url),
      ),
      `page scan ${page} must not be bundled`,
    );
  for (const occurrence of manifest.occurrences)
    assert.ok(existsSync(new URL(`../assets/achievements/${occurrence.asset}.jpg`, import.meta.url)));
  const visible = JSON.stringify({
    stats: achievementContent.stats.map(x => [x.label, x.value]),
    records: achievementContent.records.map(x => [x.title, x.description, x.status]),
    timeline: achievementContent.timeline,
  });
  assert.doesNotMatch(visible, /publication|PDF|पीडीएफ|प्रकाशन|page \d|पृष्ठ \d/i);
  const screens = readFileSync(new URL('../src/AchievementScreens.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(
    screens,
    /Reference ·|संदर्भ ·|FROM THE PUBLICATION|Source: public-service publication/,
  );
  const gallery = readFileSync(new URL('../src/content/achievement-gallery.ts', import.meta.url), 'utf8');
  assert.match(gallery, /page: 4,[^}]*cover: 'image-028'/, 'chosen cover for Public journey & meetings');
  assert.ok(existsSync(new URL('../assets/achievements/image-028.jpg', import.meta.url)));
  assert.match(gallery, /decorative\(item\)/, 'decorative strips are excluded from albums');
});
test('figures retain lower bounds, costs, stages and traceable bilingual descriptions', () => {
  const stats = Object.fromEntries(achievementContent.stats.map(item => [item.id, item]));
  assert.equal(stats.ration.value, '12,000+');
  assert.equal(stats.assistance.value, '20,000+');
  assert.equal(stats['bus-upgrade'].value, '≈ ₹1 crore');
  assert.equal(stats.manglaur.value, '₹64 lakh');
  assert.equal(stats['green-cards'].value, '32,013');
  for (const item of [...achievementContent.stats, ...achievementContent.records]) {
    for (const page of 'pages' in item ? item.pages : [item.page])
      assert.ok(page >= 1 && page <= manifest.pageCount);
    const copy = 'label' in item ? item.label : item.description;
    assert.ok(copy.en && copy.hi);
  }
  assert.equal(achievementContent.records.find(item => item.id === 'solani').status.en, 'Under construction');
  assert.equal(
    achievementContent.records.find(item => item.id === 'district-demand').status.en,
    'Demand stated',
  );
  assert.equal(achievementContent.records.find(item => item.id === 'eight-stations').status.en, 'Planned');
});
