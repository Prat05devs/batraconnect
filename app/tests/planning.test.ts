import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createIdea,
  createMeeting,
  emptyPlanning,
  filterIdeas,
  parsePlanning,
  validateIdea,
  validateMeeting,
} from '../src/planning.ts';
const draft = {
  category: 'Transport',
  title: ' Safer crossings ',
  description: ' Add marked crossings near the public library. ',
  district: ' Haridwar ',
};
const meeting = {
  subject: ' Discuss safer crossings ',
  notes: ' Ask about marked crossings near the public library. ',
  district: ' Haridwar ',
};
test('ideas require valid categories and meaningful bounded details', () => {
  assert.ok(validateIdea({ ...draft, category: 'Invented department' }));
  assert.ok(validateIdea({ ...draft, description: '  ' }));
  assert.ok(validateIdea({ ...draft, title: 'x'.repeat(101) }));
  assert.equal(validateIdea(draft), null);
});
test('saved ideas trim fields and remain explicitly local', () => {
  const idea = createIdea(draft);
  assert.equal(idea.title, 'Safer crossings');
  assert.equal(idea.district, 'Haridwar');
  assert.equal(idea.status, 'Saved locally');
  assert.match(idea.id, /^IDEA-/);
});
test('meeting preparation never produces a booked appointment or date', () => {
  assert.ok(validateMeeting({ ...meeting, notes: 'short' }));
  const note = createMeeting(meeting);
  assert.equal(note.status, 'Preparation only');
  assert.equal(note.subject, 'Discuss safer crossings');
  assert.equal('appointmentDate' in note, false);
  assert.equal('bookingId' in note, false);
});
test('planning round-trip preserves drafts, saved items and source bookmarks', () => {
  const data = {
    ...emptyPlanning(),
    ideaDraft: draft,
    meetingDraft: meeting,
    ideas: [createIdea(draft)],
    meetings: [createMeeting(meeting)],
    bookmarks: ['transport'],
  };
  assert.deepEqual(parsePlanning(JSON.stringify(data)), data);
  assert.deepEqual(parsePlanning(null), emptyPlanning());
});
test('corrupt storage and official-looking status values are rejected', () => {
  assert.throws(() => parsePlanning('{broken'));
  assert.throws(() => parsePlanning('null'));
  for (const patch of [
    { status: 'Approved' },
    { createdAt: 'yesterday' },
    { district: null },
    { id: 'SERVER-1' },
  ])
    assert.throws(() =>
      parsePlanning(JSON.stringify({ ...emptyPlanning(), ideas: [{ ...createIdea(draft), ...patch }] })),
    );
});
test('idea discovery combines category and text filters without changing data', () => {
  const ideas = [
    createIdea(draft),
    createIdea({ ...draft, category: 'Environment', title: 'Community garden', district: 'Dehradun' }),
  ];
  assert.equal(filterIdeas(ideas, 'HARIDWAR', 'Transport').length, 1);
  assert.equal(filterIdeas(ideas, 'garden', 'Transport').length, 0);
  assert.equal(filterIdeas(ideas, ' garden ', 'All')[0].title, 'Community garden');
  assert.equal(ideas.length, 2);
});
