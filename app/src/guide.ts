import { guideTopics, type GuideLanguage, type TopicId } from './content/catalog.ts';
export type GuideReply =
  { kind: 'answer'; topicId: TopicId } | { kind: 'choices'; topicIds: TopicId[] } | { kind: 'fallback' };
export function normalizeQuestion(input: string): string {
  return input
    .normalize('NFKC')
    .toLocaleLowerCase('en-IN')
    .replace(/[^\p{L}\p{N}\p{M}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
export function findGuideReply(input: string): GuideReply {
  const query = ` ${normalizeQuestion(input.slice(0, 300))} `;
  if (query.trim().length === 0) return { kind: 'fallback' };
  const matches = guideTopics.filter(topic =>
    topic.keywords.some(keyword => query.includes(` ${normalizeQuestion(keyword)} `)),
  );
  const specific = matches.filter(topic => topic.specificity >= 3);
  // Distinct specific tasks are offered as choices; never silently guess between them.
  if (specific.length > 1) return { kind: 'choices', topicIds: specific.map(t => t.id) };
  if (specific.length === 1) return { kind: 'answer', topicId: specific[0].id };
  const substantive = matches.filter(t => t.id !== 'start');
  if (substantive.length > 1) return { kind: 'choices', topicIds: substantive.map(t => t.id) };
  if (matches.length) return { kind: 'answer', topicId: (substantive[0] ?? matches[0]).id };
  return { kind: 'fallback' };
}
export function getTopic(id: TopicId) {
  return guideTopics.find(t => t.id === id)!;
}
export function replyText(reply: GuideReply, language: GuideLanguage): string {
  if (reply.kind === 'answer') return getTopic(reply.topicId).answer[language];
  if (reply.kind === 'choices')
    return language === 'en'
      ? 'I found more than one topic. Which would you like help with?'
      : 'एक से अधिक विषय मिले। आपको किस विषय पर मदद चाहिए?';
  return language === 'en'
    ? 'I don’t have a matching answer in the app’s help library. Try a suggested question below, or ask about reports, drafts, photos, services, or appointments.'
    : 'ऐप की सहायता सामग्री में इस सवाल का जवाब नहीं मिला। नीचे सुझाया सवाल चुनें, या रिपोर्ट, ड्राफ्ट, फोटो, सेवा या मुलाकात के बारे में पूछें।';
}
