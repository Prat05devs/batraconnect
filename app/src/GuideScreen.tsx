import { useLanguage } from './language';
import React, { useRef, useState } from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Pressable } from '@/components/pressable';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { findGuideReply, getTopic, replyText, type GuideReply } from './guide';
import { type GuideAction, type TopicId } from './content/catalog';
import { C, Icon, Notice, s } from './ui';
type Message = { id: number; userText: string; reply: GuideReply };
const suggestions: TopicId[] = ['report', 'track', 'services', 'draft', 'appointments', 'privacy'];
export function GuideScreen({ modal = false }: { modal?: boolean }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const { language } = useLanguage();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState('');
  const scroll = useRef<ScrollView>(null);
  const nextId = useRef(0);
  const en = language === 'en';
  function send(text: string, topicId?: TopicId) {
    if (!text.trim()) return;
    const reply: GuideReply = topicId ? { kind: 'answer', topicId } : findGuideReply(text);
    setMessages(old => [
      ...old.slice(-39),
      { id: ++nextId.current, userText: text.trim().slice(0, 300), reply },
    ]);
    setInput('');
    setError('');
    AccessibilityInfo.announceForAccessibility(replyText(reply, language));
  }
  function open(action: GuideAction) {
    if (action.route) {
      if (modal) router.dismissTo(action.route);
      else router.navigate(action.route);
    } else if (action.url)
      void Linking.openURL(action.url).catch(() =>
        setError(
          en
            ? 'The website could not be opened. Check your connection and try again.'
            : 'वेबसाइट नहीं खुली। इंटरनेट जाँचकर फिर कोशिश करें।',
        ),
      );
  }
  function chip(id: TopicId) {
    const label = getTopic(id).question[language];
    return (
      <Pressable
        key={id}
        accessibilityRole="button"
        onPress={() => send(label, id)}
        style={({ pressed }) => [g.chip, pressed && { opacity: 0.65 }]}
      >
        <Text style={g.chipText}>{label}</Text>
        <Icon name="arrow-forward" size={18} />
      </Pressable>
    );
  }
  return (
    <KeyboardAvoidingView
      style={g.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <View style={g.top}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text accessibilityRole="header" style={s.section}>
            {en ? 'Your app guide' : 'आपका ऐप गाइड'}
          </Text>
          <Text style={s.small}>{en ? 'Written answers · Works offline' : 'तय जवाब · ऑफलाइन उपलब्ध'}</Text>
        </View>
      </View>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={g.conversation}
        onContentSizeChange={() => {
          if (messages.length) scroll.current?.scrollToEnd({ animated: false });
          else scroll.current?.scrollTo({ y: 0, animated: false });
        }}
      >
        <View style={g.answer}>
          <View style={g.byline}>
            <Icon name="chatbubbles-outline" size={20} />
            <Text style={g.sender}>{en ? 'Batra Connect guide' : 'Batra Connect गाइड'}</Text>
          </View>
          <Text style={g.text}>{getTopic('start').answer[language]}</Text>
          <View style={g.choices}>{suggestions.map(chip)}</View>
        </View>
        {messages.map(message => (
          <View key={message.id} style={{ gap: 12 }}>
            <View style={g.question}>
              <Text style={g.userText}>{message.userText}</Text>
            </View>
            <View style={g.answer}>
              <Text style={g.sender}>{en ? 'App help library' : 'ऐप की सहायता सामग्री'}</Text>
              <Text selectable style={g.text}>
                {replyText(message.reply, language)}
              </Text>
              {message.reply.kind === 'answer' &&
                (() => {
                  const topic = getTopic(message.reply.topicId);
                  const action = topic.action?.[language];
                  return (
                    <>
                      {action && (
                        <Pressable
                          accessibilityRole="button"
                          onPress={event => {
                            if (Platform.OS === 'web')
                              (event.currentTarget as unknown as { blur?: () => void }).blur?.();
                            open(action);
                          }}
                          style={({ pressed }) => [g.action, pressed && { opacity: 0.7 }]}
                        >
                          <Text style={g.actionText}>{action.label}</Text>
                          <Icon
                            name={action.url ? 'open-outline' : 'arrow-forward'}
                            color={C.white}
                            size={20}
                          />
                        </Pressable>
                      )}
                      <Text style={s.small}>{en ? 'You can also ask' : 'यह भी पूछ सकते हैं'}</Text>
                      <View style={g.choices}>{topic.related.slice(0, 2).map(chip)}</View>
                    </>
                  );
                })()}
              {message.reply.kind !== 'answer' && (
                <View style={g.choices}>
                  {(message.reply.kind === 'choices' ? message.reply.topicIds : suggestions.slice(0, 4)).map(
                    chip,
                  )}
                </View>
              )}
            </View>
          </View>
        ))}
        {error ? <Notice error>{error}</Notice> : null}
        <Text style={[s.small, { textAlign: 'center' }]}>
          {en
            ? 'Questions stay in this app session. No AI or live agent.'
            : 'सवाल इस ऐप सत्र तक रहते हैं। AI या लाइव एजेंट नहीं है।'}
        </Text>
      </ScrollView>
      <View style={[g.composer, modal && { paddingBottom: Math.max(16, insets.bottom) }]}>
        <Text style={s.label}>{en ? 'What would you like to do?' : 'आप क्या करना चाहते हैं?'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TextInput
            accessibilityLabel={en ? 'Ask the app guide' : 'ऐप गाइड से सवाल पूछें'}
            value={input}
            onChangeText={setInput}
            maxLength={300}
            placeholder={en ? 'e.g. How do I track a report?' : 'जैसे: मेरी रिपोर्ट कहाँ है?'}
            placeholderTextColor={C.muted}
            style={[s.input, { flex: 1 }]}
            returnKeyType="send"
            onSubmitEditing={() => send(input)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={en ? 'Send question' : 'सवाल भेजें'}
            accessibilityState={{ disabled: !input.trim() }}
            disabled={!input.trim()}
            onPress={() => send(input)}
            style={({ pressed }) => [g.send, { opacity: !input.trim() ? 0.45 : pressed ? 0.7 : 1 }]}
          >
            <Icon name="arrow-up" color={C.white} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
const g = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  top: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  languages: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  language: { minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  conversation: { padding: 20, gap: 20, maxWidth: 700, width: '100%', alignSelf: 'center' },
  answer: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    padding: 16,
    gap: 12,
  },
  byline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sender: { fontSize: 13, fontWeight: '600', color: C.muted },
  text: { fontSize: 16, color: C.navy, lineHeight: 25 },
  question: {
    alignSelf: 'flex-end',
    maxWidth: '90%',
    backgroundColor: C.navy,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    padding: 16,
  },
  userText: { fontSize: 16, color: C.white, lineHeight: 25 },
  choices: { gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: C.pale,
    borderRadius: 12,
  },
  chipText: { fontSize: 15, fontWeight: '500', color: C.blue, flex: 1, lineHeight: 22 },
  action: {
    minHeight: 52,
    padding: 14,
    borderRadius: 12,
    backgroundColor: C.blue,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionText: { fontSize: 16, fontWeight: '600', color: C.white, flex: 1 },
  composer: {
    padding: 16,
    paddingTop: 12,
    gap: 8,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderColor: C.border,
  },
  send: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: C.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
