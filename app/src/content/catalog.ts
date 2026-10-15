/** Shared, editorial app knowledge used by the offline app guide. No generated answers or remote chat service. */
export const officialSources = [
  {
    id: 'transport',
    title: 'Transport services',
    detail: 'Uttarakhand Transport Department',
    url: 'https://transport.uk.gov.in/',
    icon: 'car-outline' as const,
  },
  {
    id: 'it',
    title: 'IT & public services',
    detail: 'Official IT Department website',
    url: 'https://it.uk.gov.in/',
    icon: 'desktop-outline' as const,
  },
  {
    id: 'biotechnology',
    title: 'Biotechnology',
    detail: 'Uttarakhand Council for Biotechnology',
    url: 'https://ucb.ac.in/',
    icon: 'leaf-outline' as const,
  },
  {
    id: 'science',
    title: 'Science & technology',
    detail: 'UCOST programmes and public initiatives',
    url: 'https://it.uk.gov.in/ucost-service/',
    icon: 'flask-outline' as const,
  },
  {
    id: 'minister',
    title: 'Minister directory',
    detail: 'Official Uttarakhand government source',
    url: 'https://cm.uk.gov.in/cabinet-minister/',
    icon: 'people-outline' as const,
  },
];
export type GuideLanguage = 'en' | 'hi';
export type TopicId =
  | 'start'
  | 'report'
  | 'track'
  | 'photos'
  | 'location'
  | 'draft'
  | 'transport'
  | 'services'
  | 'appointments'
  | 'schemes'
  | 'ideas'
  | 'privacy'
  | 'roles'
  | 'sources';
export type GuideAction = {
  label: string;
  route?:
    | '/report'
    | '/requests'
    | '/service/transport'
    | '/services'
    | '/meetings'
    | '/schemes'
    | '/ideas'
    | '/profile';
  url?: string;
};
export type GuideTopic = {
  id: TopicId;
  keywords: string[];
  specificity: number;
  question: Record<GuideLanguage, string>;
  answer: Record<GuideLanguage, string>;
  related: TopicId[];
  action?: Record<GuideLanguage, GuideAction>;
};
const action = (en: string, hi: string, route: GuideAction['route']): Record<GuideLanguage, GuideAction> => ({
  en: { label: en, route },
  hi: { label: hi, route },
});
export const guideTopics: GuideTopic[] = [
  {
    id: 'start',
    keywords: ['hello', 'hi', 'help', 'what can i do', 'start', 'namaste', 'नमस्ते', 'मदद', 'शुरू'],
    specificity: 0,
    question: { en: 'What can I do here?', hi: 'मैं यहाँ क्या कर सकता हूँ?' },
    answer: {
      en: 'You can report a problem and follow it until it is fixed, read public service guides, explore schemes, send ideas to the office and book a Jan Samvad appointment. Choose a task below. I answer from the app’s fixed help library and do not search the internet.',
      hi: 'आप समस्या बता सकते हैं और उसके ठीक होने तक प्रगति देख सकते हैं, सार्वजनिक सेवाओं की जानकारी पढ़ सकते हैं, योजनाएँ देख सकते हैं, कार्यालय को सुझाव भेज सकते हैं और जन संवाद मुलाकात बुक कर सकते हैं। नीचे कोई कार्य चुनें। मैं ऐप की तय सहायता सामग्री से उत्तर देता हूँ और इंटरनेट पर खोज नहीं करता।',
    },
    related: ['report', 'track', 'services', 'ideas', 'appointments'],
  },
  {
    id: 'report',
    keywords: [
      'report',
      'complaint',
      'problem',
      'pothole',
      'broken road',
      'shikayat',
      'samasya',
      'रिपोर्ट',
      'शिकायत',
      'समस्या',
      'गड्ढा',
    ],
    specificity: 1,
    question: { en: 'How do I report a problem?', hi: 'समस्या की रिपोर्ट कैसे करूँ?' },
    answer: {
      en: 'Choose a category, describe the issue, add optional photos and enter its location. Review it, then sign in and send it to Batra Connect for a receipt, or save it locally on this device.',
      hi: 'श्रेणी चुनें, समस्या बताएँ, चाहें तो फोटो जोड़ें और स्थान भरें। जाँचकर लॉगिन करें और प्राप्ति संख्या के लिए Batra Connect को भेजें, या डिवाइस पर स्थानीय रूप से सहेजें।',
    },
    action: action('Start a report', 'रिपोर्ट शुरू करें', '/report'),
    related: ['photos', 'location', 'draft'],
  },
  {
    id: 'track',
    keywords: [
      'track',
      'status',
      'my requests',
      'my reports',
      'saved reports',
      'follow',
      'tracking',
      'स्थिति',
      'मेरी शिकायत',
      'मेरी रिपोर्ट',
      'स्टेटस',
    ],
    specificity: 3,
    question: { en: 'Where are my requests?', hi: 'मेरी रिपोर्ट कहाँ हैं?' },
    answer: {
      en: 'Open Submitted reports to follow reports sent to Batra Connect: see the status, the service deadline, the responsible office and every update, and accept or reopen a resolution. A Batra Connect receipt is not a government acknowledgement. My requests also lists reports saved only on this phone.',
      hi: 'बत्रा कनेक्ट को भेजी रिपोर्ट देखने के लिए भेजी गई रिपोर्ट खोलें: स्थिति, सेवा समय-सीमा, ज़िम्मेदार कार्यालय और हर अपडेट देखें, और समाधान स्वीकार करें या फिर खोलें। बत्रा कनेक्ट की रसीद सरकारी पावती नहीं है। मेरी रिपोर्ट में केवल इस फ़ोन पर सहेजी रिपोर्ट भी दिखती हैं।',
    },
    action: action('Open my requests', 'मेरी रिपोर्ट खोलें', '/requests'),
    related: ['draft', 'privacy'],
  },
  {
    id: 'photos',
    keywords: [
      'photo',
      'photos',
      'camera',
      'picture',
      'evidence',
      'upload',
      'gallery',
      'फोटो',
      'कैमरा',
      'तस्वीर',
      'सबूत',
    ],
    specificity: 4,
    question: { en: 'Do I need to add photos?', hi: 'क्या फोटो जोड़ना ज़रूरी है?' },
    answer: {
      en: 'Photos are optional. Attach up to three using the camera or library. They stay on your device until you send the report. Submitted photos are accessible to your account and staff authorised for that report. If permission is denied, continue without photos.',
      hi: 'फोटो वैकल्पिक हैं। कैमरे या गैलरी से अधिकतम 3 फोटो जोड़ें। रिपोर्ट भेजने तक फोटो डिवाइस पर रहती हैं। भेजी फोटो आपके खाते और उस रिपोर्ट के अधिकृत कर्मचारियों को दिखती हैं। अनुमति न मिले तो बिना फोटो आगे बढ़ें।',
    },
    action: action('Continue a report', 'रिपोर्ट जारी रखें', '/report'),
    related: ['report', 'privacy'],
  },
  {
    id: 'location',
    keywords: ['location', 'district', 'landmark', 'gps', 'map', 'address', 'जिला', 'स्थान', 'पता', 'लोकेशन'],
    specificity: 4,
    question: { en: 'How do I add the location?', hi: 'स्थान कैसे जोड़ूँ?' },
    answer: {
      en: 'Choose the district, add a street or landmark, and if you are at the spot tap “Use my current location” to attach your position. In Haridwar you can also pick the Roorkee ward. Your position is shared only with the office handling the report.',
      hi: 'जिला चुनें, गली या पहचान का स्थान लिखें, और यदि आप वहीं हैं तो “मेरा वर्तमान स्थान उपयोग करें” दबाकर स्थान जोड़ें। हरिद्वार में रुड़की का वार्ड भी चुन सकते हैं। आपका स्थान केवल रिपोर्ट संभालने वाले कार्यालय को दिखता है।',
    },
    action: action('Continue a report', 'रिपोर्ट जारी रखें', '/report'),
    related: ['report', 'draft'],
  },
  {
    id: 'draft',
    keywords: ['draft', 'continue', 'resume', 'edit', 'unfinished', 'ड्राफ्ट', 'अधूरी', 'जारी', 'बदलना'],
    specificity: 4,
    question: { en: 'Can I come back to my draft?', hi: 'क्या अधूरी रिपोर्ट जारी रख सकता हूँ?' },
    answer: {
      en: 'Drafts save automatically on this phone. Open Report a problem to continue. When you send without internet, the report is kept safely and sent automatically when you are back online.',
      hi: 'ड्राफ्ट इस फ़ोन पर अपने आप सहेजे जाते हैं। जारी रखने के लिए समस्या बताएँ खोलें। बिना इंटरनेट भेजने पर रिपोर्ट सुरक्षित रहती है और ऑनलाइन होते ही अपने आप भेज दी जाती है।',
    },
    action: action('Continue my draft', 'मेरा ड्राफ्ट जारी रखें', '/report'),
    related: ['track', 'privacy'],
  },
  {
    id: 'transport',
    keywords: ['transport', 'licence', 'license', 'vehicle', 'registration', 'परिवहन', 'लाइसेंस', 'वाहन'],
    specificity: 3,
    question: { en: 'How do I use transport services?', hi: 'परिवहन सेवाएँ कैसे उपयोग करूँ?' },
    answer: {
      en: 'Read the in-app transport guides for licence applications, renewal and vehicle registration. Prepare documents and follow the steps here, then continue on Sarathi or Vahan to apply. Batra Connect does not submit applications or pay fees.',
      hi: 'लाइसेंस आवेदन, नवीनीकरण और वाहन पंजीकरण की जानकारी ऐप में पढ़ें। यहाँ दस्तावेज़ और चरण समझें, फिर आवेदन के लिए Sarathi या Vahan पर जाएँ। Batra Connect आवेदन जमा या शुल्क भुगतान नहीं करता।',
    },
    action: action('Read transport guides', 'परिवहन की जानकारी पढ़ें', '/service/transport'),
    related: ['services', 'report'],
  },
  {
    id: 'services',
    keywords: ['services', 'service', 'portal', 'digital', 'it department', 'सेवा', 'सेवाएँ', 'पोर्टल'],
    specificity: 1,
    question: { en: 'How do I find a public service?', hi: 'सरकारी सेवा कैसे ढूँढूँ?' },
    answer: {
      en: 'Choose a department in Services to read public information, documents and preparation steps inside the app. Guides work offline. Only application, grievance-registration and form-download actions open official websites.',
      hi: 'Services में विभाग चुनकर सार्वजनिक जानकारी, दस्तावेज़ और तैयारी के चरण ऐप में पढ़ें। जानकारी ऑफलाइन उपलब्ध है। आवेदन, आधिकारिक शिकायत पंजीकरण और फॉर्म डाउनलोड के लिए ही वेबसाइट खुलती है।',
    },
    action: action('Explore services', 'सेवाएँ देखें', '/services'),
    related: ['transport', 'schemes', 'sources'],
  },
  {
    id: 'appointments',
    keywords: [
      'appointment',
      'meeting',
      'jan samvad',
      'book a meeting',
      'meet minister',
      'मुलाकात',
      'जन संवाद',
      'जनसंवाद',
      'अपॉइंटमेंट',
    ],
    specificity: 4,
    question: { en: 'Can I book a Jan Samvad appointment?', hi: 'क्या जन संवाद की मुलाकात बुक कर सकता हूँ?' },
    answer: {
      en: 'Open Jan Samvad to book a time with the office. Choose an available session, add what you want to discuss and send the request. You are notified when it is confirmed and reminded a day before. You can reschedule or cancel from the appointment.',
      hi: 'कार्यालय से मिलने का समय बुक करने के लिए जन संवाद खोलें। उपलब्ध सत्र चुनें, चर्चा का विषय लिखें और अनुरोध भेजें। पुष्टि होने पर सूचना मिलेगी और एक दिन पहले याद दिलाया जाएगा। आप मुलाकात से समय बदल या रद्द कर सकते हैं।',
    },
    action: action('Open Jan Samvad', 'जन संवाद खोलें', '/meetings'),
    related: ['services', 'sources'],
  },
  {
    id: 'schemes',
    keywords: [
      'scheme',
      'schemes',
      'pension',
      'pm kisan',
      'swarojgar',
      'mahalaxmi',
      'poshan',
      'पेंशन',
      'eligibility',
      'benefit',
      'yojana',
      'योजना',
      'योजनाएँ',
      'पात्रता',
      'लाभ',
    ],
    specificity: 4,
    question: { en: 'Can I explore government schemes?', hi: 'क्या सरकारी योजनाएँ देख सकता हूँ?' },
    answer: {
      en: 'Schemes & benefits has a selected catalogue reviewed from government sources on 8 October 2026. Search by name or category, save schemes on your device and open a scheme for benefit, eligibility and application summaries. Follow its source link for current rules. This guide does not decide eligibility or submit applications.',
      hi: 'Schemes & benefits में 8 अक्टूबर 2026 को सरकारी स्रोतों से जाँची गई चुनिंदा योजनाएँ हैं। नाम या श्रेणी से खोजें, योजनाएँ डिवाइस पर सहेजें और लाभ, पात्रता तथा आवेदन का सार देखें। वर्तमान नियमों के लिए स्रोत लिंक खोलें। यह गाइड पात्रता तय या आवेदन जमा नहीं करता।',
    },
    action: action('Explore schemes information', 'योजना की जानकारी देखें', '/schemes'),
    related: ['services', 'sources'],
  },
  {
    id: 'ideas',
    keywords: [
      'idea',
      'ideas',
      'development project',
      'projects',
      'suggestion',
      'विचार',
      'सुझाव',
      'परियोजना',
    ],
    specificity: 4,
    question: { en: 'Can I share an idea or see projects?', hi: 'क्या विचार साझा कर सकता हूँ?' },
    answer: {
      en: 'Open Ideas & projects to write a suggestion. Send it to the office to receive a response, or keep it on this phone for later. You can follow the office’s reply under Ideas you sent.',
      hi: 'सुझाव लिखने के लिए विचार और परियोजनाएँ खोलें। उत्तर पाने के लिए इसे कार्यालय को भेजें, या बाद के लिए इस फ़ोन पर रखें। कार्यालय का उत्तर भेजे गए सुझावों में देखें।',
    },
    action: action('Open ideas & projects', 'विचार और परियोजनाएँ देखें', '/ideas'),
    related: ['report', 'sources'],
  },
  {
    id: 'privacy',
    keywords: [
      'privacy',
      'data',
      'clear',
      'delete',
      'offline',
      'internet',
      'password',
      'private',
      'डेटा',
      'गोपनीयता',
      'मिटाना',
      'ऑफलाइन',
      'इंटरनेट',
    ],
    specificity: 4,
    question: { en: 'Where is my information saved?', hi: 'मेरी जानकारी कहाँ सहेजी जाती है?' },
    answer: {
      en: 'Drafts and reports saved on this phone are encrypted on the device. Reports you send, with their photos, are seen only by you and the officers responsible for them; photo location data is removed. You can download your data or delete your account in Account and security.',
      hi: 'इस फ़ोन पर सहेजे ड्राफ्ट और रिपोर्ट डिवाइस पर एन्क्रिप्ट रहते हैं। भेजी गई रिपोर्ट और फोटो केवल आप और ज़िम्मेदार अधिकारी देखते हैं; फोटो का स्थान डेटा हटा दिया जाता है। खाता और सुरक्षा में आप अपना डेटा डाउनलोड कर सकते हैं या खाता हटा सकते हैं।',
    },
    action: action('Open profile', 'प्रोफ़ाइल खोलें', '/profile'),
    related: ['draft', 'track'],
  },
  {
    id: 'roles',
    keywords: [
      'role',
      'officer',
      'nodal',
      'executive',
      'login',
      'sign in',
      'department workspace',
      'अधिकारी',
      'भूमिका',
      'लॉगिन',
    ],
    specificity: 4,
    question: { en: 'How do the different roles work?', hi: 'अलग भूमिकाएँ कैसे काम करती हैं?' },
    answer: {
      en: 'Anyone can create a resident account through Sign in. Office staff receive their accounts from the administrator and sign in on the same screen; they then see their work alongside the rest of the app, and can still send reports and ideas as residents.',
      hi: 'कोई भी Sign in से निवासी खाता बना सकता है। कार्यालय स्टाफ को खाते प्रशासक देते हैं और वे इसी स्क्रीन से लॉगिन करते हैं; फिर उन्हें ऐप के साथ अपना कार्य दिखता है, और वे निवासी के रूप में रिपोर्ट और सुझाव भी भेज सकते हैं।',
    },
    action: action('Sign in', 'लॉगिन करें', '/profile'),
    related: ['start', 'privacy'],
  },
  {
    id: 'sources',
    keywords: [
      'source',
      'sources',
      'minister',
      'achievement',
      'initiatives',
      'verified',
      'स्रोत',
      'मंत्री',
      'उपलब्धि',
    ],
    specificity: 2,
    question: { en: 'Where does this information come from?', hi: 'यह जानकारी कहाँ से आती है?' },
    answer: {
      en: 'This guide uses the app’s written help library and the public service information shown in Services. It does not generate answers or search the web. Achievements, projects and photos are provided and updated by the minister’s office.',
      hi: 'यह गाइड ऐप की लिखी सहायता सामग्री और Services में दी गई सार्वजनिक सेवा जानकारी का उपयोग करता है। यह नए जवाब नहीं बनाता और वेब पर खोज नहीं करता। उपलब्धियाँ, परियोजनाएँ और चित्र मंत्री कार्यालय द्वारा दिए और अद्यतन किए जाते हैं।',
    },
    action: action('Open the source library', 'स्रोत सूची खोलें', '/services'),
    related: ['services', 'roles'],
  },
];
