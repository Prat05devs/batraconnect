import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findGuideReply, getTopic, replyText } from '../src/guide.ts';
import { guideTopics } from '../src/content/catalog.ts';
test('a request-status question opens the tracking topic rather than generic reporting', () => {
  assert.deepEqual(findGuideReply('What is my complaint status?'), { kind: 'answer', topicId: 'track' });
});
test('English, Hindi and Roman Hindi questions use fixed app knowledge', () => {
  assert.deepEqual(findGuideReply('I want to make a shikayat'), { kind: 'answer', topicId: 'report' });
  assert.deepEqual(findGuideReply('फोटो कैसे जोड़ूँ?'), { kind: 'answer', topicId: 'photos' });
  assert.match(replyText({ kind: 'answer', topicId: 'photos' }, 'hi'), /3/);
});
test('word boundaries prevent greeting matches inside unrelated words', () => {
  assert.deepEqual(findGuideReply('this quantum pineapple'), { kind: 'fallback' });
  assert.deepEqual(findGuideReply(''), { kind: 'fallback' });
});
test('two specific tasks produce choices instead of an invented answer', () => {
  const reply = findGuideReply('transport licence and appointment');
  assert.equal(reply.kind, 'choices');
  if (reply.kind === 'choices') assert.deepEqual(reply.topicIds, ['transport', 'appointments']);
});
test('photo questions outrank the general report keyword', () => {
  assert.deepEqual(findGuideReply('Do I need a photo for my report?'), { kind: 'answer', topicId: 'photos' });
});
test('Jan Samvad answers describe the real booking flow and receipts stay honest', () => {
  assert.equal(getTopic('appointments').action?.en.route, '/meetings');
  assert.equal(getTopic('appointments').action?.en.label, 'Open Jan Samvad');
  assert.match(getTopic('appointments').answer.en, /confirmed/);
  assert.match(getTopic('track').answer.en, /not a government acknowledgement/);
});
test('every related topic exists and transport opens the in-app guide', () => {
  for (const topic of guideTopics)
    for (const related of topic.related) assert.ok(guideTopics.some(t => t.id === related));
  assert.equal(getTopic('transport').action?.en.route, '/service/transport');
});
