/** Public website copy. English and Hindi live side by side so the two pages never drift apart. */
export type Lang = 'en' | 'hi';

export const site = {
  name: 'Batra Connect',
  url: 'https://batraconnect.com',
  contactEmail: 'contact@batraconnect.com',
  privacyEmail: 'privacy@batraconnect.com',
};

export const copy = {
  en: {
    nav: {
      features: 'Features',
      how: 'How it works',
      privacy: 'Privacy',
      switchLang: 'हिन्दी',
      switchHref: '/hi',
    },
    hero: {
      badge: 'Coming soon to Android and iPhone',
      eyebrow: 'Office of Shri Pradeep Batra',
      title: 'Raise an issue. Follow it until it is fixed.',
      body: 'Batra Connect puts residents of Roorkee and Uttarakhand in direct touch with the office of Cabinet Minister and Roorkee MLA Shri Pradeep Batra. Report a problem with a photo, see who is handling it and when it is due, and confirm when the work is done.',
      soon: 'Coming soon',
      play: 'Google Play',
      appStore: 'App Store',
      note: 'Free. In English and हिन्दी.',
    },
    phone: {
      title: 'Your report',
      ref: 'BC-20261013',
      issue: 'Street light not working',
      place: 'Ward 12, Roorkee',
      steps: ['Received', 'Assigned to field officer', 'Work in progress', 'Resolved with photo'],
      due: 'Due in 3 days',
    },
    features: {
      kicker: 'What’s inside the app',
      title: 'Everything in one app',
      intro: 'Built for residents first, and for the officers who answer them.',
      items: [
        [
          'Report a problem',
          'Roads, water, drainage, street lights, sanitation and more. Add up to three photos and your location in a few taps.',
        ],
        [
          'Track it to the end',
          'Every report has a reference number, a responsible officer and a deadline. You are notified at each step.',
        ],
        [
          'Nothing gets forgotten',
          'If a deadline passes, the report is escalated automatically, up to the minister’s office.',
        ],
        [
          'Jan Samvad appointments',
          'Book a time to meet the office in person, and get a reminder the day before.',
        ],
        ['Share your ideas', 'Suggest improvements for your area and see what the office decides.'],
        [
          'Services and schemes',
          'Plain-language guides to government services and schemes, with official links.',
        ],
      ],
    },
    how: {
      kicker: 'How it works',
      title: 'How a report moves',
      steps: [
        ['You report', 'Describe the problem, add photos and choose your ward.'],
        [
          'An officer is assigned',
          'The responsible department assigns a field officer with a clear deadline.',
        ],
        ['The work is done', 'The officer marks it resolved and attaches a photo of the completed work.'],
        ['You confirm', 'Close the report if you are satisfied, or reopen it if the problem is still there.'],
      ],
    },
    office: {
      title: 'One representative. Two responsibilities.',
      body: 'Shri Pradeep Batra serves as Cabinet Minister in the Government of Uttarakhand, with responsibility for Transport, Information Technology, Science and Technology and Biotechnology, and as MLA for Roorkee. Batra Connect brings both to your phone, with updates on projects, achievements and public meetings.',
      role: 'Cabinet Minister, Government of Uttarakhand · MLA, Roorkee',
    },
    gallery: {
      title: 'Also in the app: moments from public life',
      intro: 'Photo albums of projects, meetings and community events, updated by the office.',
      captions: {
        '028': 'Public journey & meetings',
        '172': 'Service centre',
        '109': 'Technology & science',
        '123': 'Roorkee development',
        '176': 'Service centre',
        '269': 'A greener city',
        '179': 'Community & culture',
        '237': 'Environment, yoga & sports',
        '107': 'Technology & science',
        '070': 'Char Dham & transport',
      },
    },
    trust: {
      title: 'Your information is handled with care',
      items: [
        [
          'Location only when you choose',
          'Your position is attached to a report only when you tap “Use my current location”.',
        ],
        [
          'Photos cleaned before storage',
          'Hidden details such as GPS position are removed from every photo.',
        ],
        [
          'You stay in control',
          'Choose how you are notified, download your data, or delete your account at any time.',
        ],
      ],
      link: 'Read the privacy policy',
    },
    footer: {
      tagline: 'Connecting residents with the office of Shri Pradeep Batra.',
      privacy: 'Privacy policy',
      terms: 'Terms of use',
      contact: 'Contact',
      staff: 'Staff sign-in',
      rights: 'All rights reserved.',
    },
  },
  hi: {
    nav: {
      features: 'सुविधाएँ',
      how: 'कैसे काम करता है',
      privacy: 'गोपनीयता',
      switchLang: 'English',
      switchHref: '/',
    },
    hero: {
      badge: 'Android और iPhone पर जल्द आ रहा है',
      eyebrow: 'श्री प्रदीप बत्रा का कार्यालय',
      title: 'समस्या बताइए। समाधान तक साथ रहिए।',
      body: 'बत्रा कनेक्ट रुड़की और उत्तराखंड के निवासियों को कैबिनेट मंत्री एवं रुड़की विधायक श्री प्रदीप बत्रा के कार्यालय से सीधे जोड़ता है। फ़ोटो के साथ समस्या दर्ज करें, देखें कि कौन इस पर काम कर रहा है और कब तक, और काम पूरा होने पर पुष्टि करें।',
      soon: 'जल्द उपलब्ध',
      play: 'Google Play',
      appStore: 'App Store',
      note: 'निःशुल्क। हिन्दी और English में।',
    },
    phone: {
      title: 'आपकी शिकायत',
      ref: 'BC-20261013',
      issue: 'स्ट्रीट लाइट खराब',
      place: 'वार्ड 12, रुड़की',
      steps: ['प्राप्त', 'फ़ील्ड अधिकारी को सौंपी गई', 'कार्य जारी', 'फ़ोटो के साथ समाधान'],
      due: '3 दिन में पूरा होना है',
    },
    features: {
      kicker: 'ऐप में क्या है',
      title: 'सब कुछ एक ऐप में',
      intro: 'पहले नागरिकों के लिए, और उन अधिकारियों के लिए जो उनकी सुनते हैं।',
      items: [
        [
          'समस्या दर्ज करें',
          'सड़क, पानी, नाली, स्ट्रीट लाइट, सफ़ाई और अन्य। कुछ ही टैप में तीन फ़ोटो और अपना स्थान जोड़ें।',
        ],
        [
          'अंत तक नज़र रखें',
          'हर शिकायत का एक संदर्भ नंबर, ज़िम्मेदार अधिकारी और समय-सीमा होती है। हर चरण पर आपको सूचना मिलती है।',
        ],
        ['कुछ भी अनदेखा नहीं', 'समय-सीमा बीतने पर शिकायत अपने आप ऊपर भेजी जाती है, मंत्री कार्यालय तक।'],
        ['जन संवाद मुलाकात', 'कार्यालय से मिलने का समय बुक करें और एक दिन पहले याद दिलाने वाला संदेश पाएँ।'],
        ['अपने सुझाव दें', 'अपने क्षेत्र के लिए सुझाव दें और जानें कि कार्यालय ने क्या तय किया।'],
        ['सेवाएँ और योजनाएँ', 'सरकारी सेवाओं और योजनाओं की आसान भाषा में जानकारी, आधिकारिक लिंक के साथ।'],
      ],
    },
    how: {
      kicker: 'कैसे काम करता है',
      title: 'शिकायत कैसे आगे बढ़ती है',
      steps: [
        ['आप दर्ज करते हैं', 'समस्या लिखें, फ़ोटो जोड़ें और अपना वार्ड चुनें।'],
        ['अधिकारी नियुक्त होता है', 'संबंधित विभाग स्पष्ट समय-सीमा के साथ फ़ील्ड अधिकारी नियुक्त करता है।'],
        ['काम पूरा होता है', 'अधिकारी पूरे हुए काम की फ़ोटो के साथ समाधान दर्ज करता है।'],
        ['आप पुष्टि करते हैं', 'संतुष्ट हों तो शिकायत बंद करें, वरना दोबारा खोलें।'],
      ],
    },
    office: {
      title: 'एक जनप्रतिनिधि। दो जिम्मेदारियाँ।',
      body: 'श्री प्रदीप बत्रा उत्तराखंड सरकार में कैबिनेट मंत्री हैं, जिनके पास परिवहन, सूचना प्रौद्योगिकी, विज्ञान एवं प्रौद्योगिकी और जैव प्रौद्योगिकी विभाग हैं, और वे रुड़की के विधायक भी हैं। बत्रा कनेक्ट परियोजनाओं, उपलब्धियों और जनसभाओं की जानकारी के साथ दोनों को आपके फ़ोन तक लाता है।',
      role: 'कैबिनेट मंत्री, उत्तराखंड सरकार · विधायक, रुड़की',
    },
    gallery: {
      title: 'ऐप में यह भी: जनजीवन की झलकियाँ',
      intro: 'परियोजनाओं, बैठकों और सामुदायिक कार्यक्रमों के फ़ोटो एल्बम, जिन्हें कार्यालय अपडेट करता है।',
      captions: {
        '028': 'जनसेवा की यात्रा और मुलाकातें',
        '172': 'सेवा केंद्र',
        '109': 'प्रौद्योगिकी और विज्ञान',
        '123': 'रुड़की का विकास',
        '176': 'सेवा केंद्र',
        '269': 'हरित शहर',
        '179': 'समुदाय और संस्कृति',
        '237': 'पर्यावरण, योग और खेल',
        '107': 'प्रौद्योगिकी और विज्ञान',
        '070': 'चारधाम और परिवहन',
      },
    },
    trust: {
      title: 'आपकी जानकारी सुरक्षित रहती है',
      items: [
        [
          'स्थान केवल आपकी मर्ज़ी से',
          'आपका स्थान शिकायत में तभी जुड़ता है जब आप “मेरा वर्तमान स्थान” चुनते हैं।',
        ],
        ['फ़ोटो सुरक्षित रूप में', 'हर फ़ोटो से GPS जैसी छिपी जानकारी हटा दी जाती है।'],
        [
          'नियंत्रण आपके हाथ में',
          'सूचनाएँ कैसे मिलें, यह चुनें, अपना डेटा डाउनलोड करें या कभी भी खाता हटाएँ।',
        ],
      ],
      link: 'गोपनीयता नीति पढ़ें',
    },
    footer: {
      tagline: 'नागरिकों को श्री प्रदीप बत्रा के कार्यालय से जोड़ते हुए।',
      privacy: 'गोपनीयता नीति',
      terms: 'उपयोग की शर्तें',
      contact: 'संपर्क',
      staff: 'स्टाफ़ लॉग-इन',
      rights: 'सर्वाधिकार सुरक्षित।',
    },
  },
} as const;
