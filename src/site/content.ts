/** Public website copy. English and Hindi live side by side so the two pages never drift apart.
 * Figures, project statuses and the timeline were provided by Shri Pradeep Batra and his team (app/src/content/achievements.ts);
 * public references for roles and election history are listed on /about-the-app. */
export type Lang = 'en' | 'hi';

export const site = {
  name: 'Batra Connect',
  url: 'https://batraconnect.com',
  /** The developer name on Google Play: an independent organisation, not the government housing scheme. */
  publisher: 'Awas Yojana',
  publisherNote:
    'an independent organisation in Dehradun, not connected with Pradhan Mantri Awas Yojana or any government scheme',
  developer: 'WT IT Solutions',
  /** The only support channel: no phone line. */
  contactEmail: 'admin@wtsolutions.cc',
  privacyEmail: 'admin@wtsolutions.cc',
};

/** The use cases the hero cycles through; each has its own illustrated phone screen in HeroShowcase. */
export const useCaseIds = ['report', 'track', 'meet', 'scheme', 'service', 'updates'] as const;
export type UseCaseId = (typeof useCaseIds)[number];

export const copy = {
  en: {
    nav: {
      features: 'Why the app',
      about: 'About',
      how: 'How it works',
      privacy: 'Privacy',
      switchLang: 'हिन्दी',
      switchHref: '/hi',
    },
    hero: {
      eyebrow: 'An initiative of Shri Pradeep Batra',
      title: 'Your MLA, one tap away.',
      body: 'Report a problem in your lane, follow it until it is fixed, book a meeting with Shri Batra’s team, and find the right scheme or government service in plain language. One free app for Roorkee, in English and हिन्दी.',
      soon: 'Coming soon',
      play: 'Google Play',
      appStore: 'App Store',
      note: 'Free · English and हिन्दी · Built for Roorkee and Uttarakhand',
      name: 'Shri Pradeep Batra',
      role: 'Cabinet Minister, Uttarakhand · MLA, Roorkee',
      tabsLabel: 'What you can do with Batra Connect',
    },
    useCases: {
      report: {
        tab: 'Report a problem',
        line: 'Photo, place, sent in a minute',
        screen: {
          title: 'New report',
          category: 'Drainage & sewerage',
          detail: 'Water has collected in our lane since last night’s rain.',
          place: 'Ward 12, Roorkee',
          photos: 'Photos (1 of 3)',
          button: 'Send report',
        },
      },
      track: {
        tab: 'Track it to the end',
        line: 'An officer, a deadline, every step',
        screen: {
          title: 'Your report',
          ref: 'BC-20261013',
          issue: 'Street light not working',
          place: 'Ward 12, Roorkee',
          due: 'Due in 3 days',
          steps: ['Received', 'Assigned to field officer', 'Work in progress', 'Resolved with photo'],
        },
      },
      meet: {
        tab: 'Meet in person',
        line: 'Book a Jan Samvad appointment',
        screen: {
          title: 'Jan Samvad',
          intro: 'Choose a time for a Jan Samvad meeting',
          slots: ['Sat, 10:30 am', 'Sat, 11:00 am', 'Mon, 4:00 pm'],
          picked: 'Request sent · you will be reminded a day before',
        },
      },
      scheme: {
        tab: 'Find a scheme',
        line: 'Pensions and benefits explained',
        screen: {
          title: 'Schemes & benefits',
          name: 'Old Age Pension Scheme',
          rows: ['Who can apply', 'Documents you need', 'Where to apply'],
          link: 'Official website',
          more: 'Widow Pension · Mahalakshmi Kit · Amrit Anchal',
        },
      },
      service: {
        tab: 'Get things done',
        line: 'Step-by-step service guides',
        screen: {
          title: 'Service guide',
          name: 'Renew your driving licence',
          steps: ['Check what you need', 'Apply online', 'Book a slot and pay the fee'],
          more: 'Learner licence · Vehicle RC · CM Helpline',
        },
      },
      updates: {
        tab: 'Stay informed',
        line: 'Projects, meetings and alerts',
        screen: {
          title: 'Updates',
          items: [
            ['Your report was resolved', 'A photo of the completed work is attached.'],
            ['Jan Samvad this Saturday', 'Sessions from 10:00 am at the service centre.'],
            ['Solani river bridge', 'Construction continues ahead of Kumbh.'],
          ],
        },
      },
    },
    moments: {
      kicker: 'Why keep it on your phone',
      title: 'For the days you need help, fast',
      intro: 'You may not open it every day. But when one of these moments comes, it is already there.',
      items: [
        {
          photo: '259',
          title: 'When rain floods your lane',
          body: 'Send a photo and your location. The report reaches the right department with a deadline, and you see every step.',
          tag: 'Report a problem',
        },
        {
          photo: '171',
          title: 'When a parent needs a pension',
          body: 'Read who can apply, which documents to keep ready and where to go, for old-age, widow and other schemes.',
          tag: 'Schemes & benefits',
        },
        {
          photo: '172',
          title: 'When you want to meet in person',
          body: 'Book a Jan Samvad slot instead of waiting in line. You are told when it is confirmed and reminded the day before.',
          tag: 'Jan Samvad',
        },
        {
          photo: '141',
          title: 'When your licence is due',
          body: 'Plain-language guides for licences, vehicle registration and certificates, with links to the official portals.',
          tag: 'Service guides',
        },
        {
          photo: '263',
          title: 'When something has gone unanswered',
          body: 'If a deadline passes, your report is escalated automatically, up to Shri Batra’s own team. Nothing is quietly dropped.',
          tag: 'Automatic escalation',
        },
        {
          photo: '138',
          title: 'When you wonder what is being built',
          body: 'Follow projects such as the Solani river bridge, and news from public meetings, shared by Shri Batra’s team.',
          tag: 'Projects & updates',
        },
      ],
    },
    about: {
      kicker: 'Meet your representative',
      title: 'Shri Pradeep Batra',
      role: 'Cabinet Minister, Government of Uttarakhand · MLA, Roorkee',
      body: 'Shri Pradeep Batra has served Roorkee for more than fifteen years: first as municipal chairman, then as MLA, and now also as a Cabinet Minister in the Government of Uttarakhand. Batra Connect is his own initiative to stay in closer touch with the people he serves.',
      departmentsTitle: 'Departments',
      departments: [
        'Transport',
        'Information Technology and Good Governance',
        'Science and Technology',
        'Biotechnology',
      ],
      timelineTitle: 'A journey of public service',
      timeline: [
        ['2008', 'Elected municipal chairman of Roorkee.'],
        ['2012', 'First elected MLA, holding both responsibilities for a year.'],
        ['2017–2022', 'Served the people of Roorkee in the Uttarakhand Legislative Assembly.'],
        ['2022 onward', 'Continuing public service, including as Cabinet Minister.'],
      ],
      photos: {
        '203': 'Raising Roorkee’s issues in the Assembly',
        '112': 'At the Biotech Bhawan laboratories, Pantnagar',
        '262': 'On site during development work',
        '241': 'With young athletes',
      },
    },
    impact: {
      title: 'Help that reached people',
      intro: 'Through his service centre in Roorkee.',
      stats: [
        ['20,000+', 'People given financial assistance'],
        ['12,000+', 'Ration cards made'],
        ['8,000+', 'Old-age pensions approved'],
        ['5,000+', 'New Ayushman cards'],
        ['5,000+', 'Voter ID cards issued'],
        ['3,000+', 'Families helped with a daughter’s marriage'],
      ],
      note: 'Figures provided by Shri Pradeep Batra’s team. Categories may overlap.',
    },
    work: {
      kicker: 'His work as Cabinet Minister',
      note: 'Project details as provided by Shri Pradeep Batra’s team.',
      sources: 'Sources and references',
      title: 'Beyond Roorkee, across Uttarakhand',
      items: [
        {
          icon: 'transport',
          title: 'Digital transport office',
          status: 'Launched',
          body: 'Licences, permits, registration and renewals online, with slot booking, status tracking and fee payment.',
        },
        {
          icon: 'ai',
          title: 'IT and AI centre, Gaujajali (Haldwani)',
          status: 'Opened',
          body: 'For AI research, digital jobs, skills and citizen-centred digital governance.',
        },
        {
          icon: 'biotech',
          title: 'Biotech Bhawan, Pantnagar',
          status: 'Inaugurated',
          body: 'Research laboratories and facilities for students and researchers.',
        },
        {
          icon: 'bus',
          title: 'Roorkee bus-station upgrade',
          status: 'Inaugurated',
          body: 'About ₹1 crore: feeding and play rooms, toilets, lighting, RO water, CCTV and regular cleaning.',
        },
        {
          icon: 'health',
          title: 'Critical-care block, Civil Hospital',
          status: 'Preparation underway',
          body: 'A ₹20 crore, 50-bed block with 15 ICU beds and 25 general beds.',
        },
        {
          icon: 'bridge',
          title: 'Solani river bridge',
          status: 'Under construction',
          body: 'Targeted before Kumbh, with an additional 15-metre span approved.',
        },
      ],
    },
    features: {
      kicker: 'What’s inside the app',
      title: 'Everything in one app',
      intro: 'Built for residents first, and for the team that answers them.',
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
          'If a deadline passes, the report is escalated automatically, up to Shri Batra’s own team.',
        ],
        ['Jan Samvad appointments', 'Book a time to meet in person, and get a reminder the day before.'],
        ['Share your ideas', 'Suggest improvements for your area and see what is decided.'],
        [
          'Services and schemes',
          'Plain-language guides to 14 government services and 7 schemes, with official links.',
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
          'Shri Batra’s team passes it to a responsible officer, with a clear deadline.',
        ],
        ['The work is done', 'The officer marks it resolved and attaches a photo of the completed work.'],
        ['You confirm', 'Close the report if you are satisfied, or reopen it if the problem is still there.'],
      ],
    },
    gallery: {
      title: 'Moments from public life',
      intro: 'Albums of projects, meetings and community events are in the app, shared by Shri Batra’s team.',
      captions: {
        '176': 'Service centre',
        '269': 'A cleaner, greener city',
        '238': 'Yoga day',
        '179': 'Community & culture',
        '145': 'Roorkee development',
        '128': 'HRDA sports complex',
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
    cta: {
      title: 'Keep Batra Connect on your phone',
      body: 'It is free, works in English and हिन्दी, and is there the moment you need it.',
    },
    footer: {
      tagline:
        'An independent initiative of Shri Pradeep Batra. Not a government app. Published by Awas Yojana, Dehradun (not connected with Pradhan Mantri Awas Yojana or any government scheme). Built and run by WT IT Solutions.',
      privacy: 'Privacy policy',
      terms: 'Terms of use',
      contact: 'Contact',
      staff: 'Staff sign-in',
      about: 'About the app & sources',
      deletion: 'Delete your account',
      rights: 'All rights reserved.',
    },
  },
  hi: {
    nav: {
      features: 'ऐप क्यों',
      about: 'परिचय',
      how: 'कैसे काम करता है',
      privacy: 'गोपनीयता',
      switchLang: 'English',
      switchHref: '/',
    },
    hero: {
      eyebrow: 'श्री प्रदीप बत्रा की पहल',
      title: 'आपके विधायक, बस एक टैप दूर।',
      body: 'अपनी गली की समस्या दर्ज करें, समाधान तक नज़र रखें, श्री बत्रा की टीम से मिलने का समय बुक करें, और सही योजना या सरकारी सेवा की जानकारी आसान भाषा में पाएँ। रुड़की के लिए एक निःशुल्क ऐप, हिन्दी और English में।',
      soon: 'जल्द उपलब्ध',
      play: 'Google Play',
      appStore: 'App Store',
      note: 'निःशुल्क · हिन्दी और English · रुड़की और उत्तराखंड के लिए',
      name: 'श्री प्रदीप बत्रा',
      role: 'कैबिनेट मंत्री, उत्तराखंड · विधायक, रुड़की',
      tabsLabel: 'बत्रा कनेक्ट से आप क्या कर सकते हैं',
    },
    useCases: {
      report: {
        tab: 'समस्या दर्ज करें',
        line: 'फ़ोटो, स्थान, एक मिनट में',
        screen: {
          title: 'नई शिकायत',
          category: 'नाली और सीवर',
          detail: 'कल रात की बारिश से हमारी गली में पानी भरा है।',
          place: 'वार्ड 12, रुड़की',
          photos: 'फ़ोटो (3 में से 1)',
          button: 'शिकायत भेजें',
        },
      },
      track: {
        tab: 'अंत तक नज़र रखें',
        line: 'अधिकारी, समय-सीमा, हर चरण',
        screen: {
          title: 'आपकी शिकायत',
          ref: 'BC-20261013',
          issue: 'स्ट्रीट लाइट खराब',
          place: 'वार्ड 12, रुड़की',
          due: '3 दिन में पूरा होना है',
          steps: ['प्राप्त', 'फ़ील्ड अधिकारी को सौंपी गई', 'कार्य जारी', 'फ़ोटो के साथ समाधान'],
        },
      },
      meet: {
        tab: 'आमने-सामने मिलें',
        line: 'जन संवाद का समय बुक करें',
        screen: {
          title: 'जन संवाद',
          intro: 'जन संवाद मुलाकात का समय चुनें',
          slots: ['शनिवार, सुबह 10:30', 'शनिवार, सुबह 11:00', 'सोमवार, शाम 4:00'],
          picked: 'अनुरोध भेजा गया · एक दिन पहले याद दिलाया जाएगा',
        },
      },
      scheme: {
        tab: 'योजना खोजें',
        line: 'पेंशन और लाभ की जानकारी',
        screen: {
          title: 'योजनाएँ और लाभ',
          name: 'वृद्धावस्था पेंशन योजना',
          rows: ['कौन आवेदन कर सकता है', 'ज़रूरी दस्तावेज़', 'कहाँ आवेदन करें'],
          link: 'आधिकारिक वेबसाइट',
          more: 'विधवा पेंशन · महालक्ष्मी किट · अमृत आँचल',
        },
      },
      service: {
        tab: 'काम आसान करें',
        line: 'सेवाओं की चरण-दर-चरण जानकारी',
        screen: {
          title: 'सेवा गाइड',
          name: 'ड्राइविंग लाइसेंस का नवीनीकरण',
          steps: ['ज़रूरी कागज़ देखें', 'ऑनलाइन आवेदन करें', 'स्लॉट बुक करें और शुल्क भरें'],
          more: 'लर्नर लाइसेंस · वाहन आरसी · सीएम हेल्पलाइन',
        },
      },
      updates: {
        tab: 'जानकारी पाते रहें',
        line: 'परियोजनाएँ, बैठकें और सूचनाएँ',
        screen: {
          title: 'अपडेट',
          items: [
            ['आपकी शिकायत का समाधान हुआ', 'पूरे हुए काम की फ़ोटो साथ में है।'],
            ['इस शनिवार जन संवाद', 'सेवा केंद्र में सुबह 10:00 बजे से।'],
            ['सोलानी नदी का पुल', 'कुंभ से पहले निर्माण जारी है।'],
          ],
        },
      },
    },
    moments: {
      kicker: 'इसे फ़ोन में क्यों रखें',
      title: 'जब मदद जल्दी चाहिए',
      intro: 'हो सकता है आप इसे रोज़ न खोलें। पर जब ऐसा कोई मौका आए, यह पहले से आपके पास होगा।',
      items: [
        {
          photo: '259',
          title: 'जब बारिश से गली में पानी भर जाए',
          body: 'फ़ोटो और स्थान भेजें। शिकायत समय-सीमा के साथ सही विभाग तक पहुँचती है, और आप हर चरण देखते हैं।',
          tag: 'समस्या दर्ज करें',
        },
        {
          photo: '171',
          title: 'जब माता-पिता को पेंशन चाहिए',
          body: 'वृद्धावस्था, विधवा और अन्य योजनाओं में कौन आवेदन कर सकता है, कौन से दस्तावेज़ चाहिए और कहाँ जाना है, सब पढ़ें।',
          tag: 'योजनाएँ और लाभ',
        },
        {
          photo: '172',
          title: 'जब आमने-सामने मिलना हो',
          body: 'लाइन में इंतज़ार की जगह जन संवाद का समय बुक करें। पुष्टि होने पर सूचना और एक दिन पहले याद दिलाने वाला संदेश मिलता है।',
          tag: 'जन संवाद',
        },
        {
          photo: '141',
          title: 'जब लाइसेंस का नवीनीकरण हो',
          body: 'लाइसेंस, वाहन पंजीकरण और प्रमाण पत्रों की आसान भाषा में जानकारी, आधिकारिक पोर्टल के लिंक के साथ।',
          tag: 'सेवा गाइड',
        },
        {
          photo: '263',
          title: 'जब सुनवाई न हो रही हो',
          body: 'समय-सीमा बीतने पर आपकी शिकायत अपने आप ऊपर भेजी जाती है, श्री बत्रा की अपनी टीम तक। कुछ भी चुपचाप नहीं छूटता।',
          tag: 'स्वचालित एस्केलेशन',
        },
        {
          photo: '138',
          title: 'जब जानना हो कि क्या बन रहा है',
          body: 'सोलानी नदी के पुल जैसी परियोजनाओं और जनसभाओं की खबरें श्री बत्रा की टीम से पाएँ।',
          tag: 'परियोजनाएँ और अपडेट',
        },
      ],
    },
    about: {
      kicker: 'अपने जनप्रतिनिधि को जानें',
      title: 'श्री प्रदीप बत्रा',
      role: 'कैबिनेट मंत्री, उत्तराखंड सरकार · विधायक, रुड़की',
      body: 'श्री प्रदीप बत्रा पंद्रह वर्षों से अधिक समय से रुड़की की सेवा कर रहे हैं: पहले नगर पालिका अध्यक्ष, फिर विधायक, और अब उत्तराखंड सरकार में कैबिनेट मंत्री भी। बत्रा कनेक्ट लोगों से और करीब से जुड़े रहने की उनकी अपनी पहल है।',
      departmentsTitle: 'विभाग',
      departments: [
        'परिवहन',
        'सूचना प्रौद्योगिकी एवं सुशासन',
        'विज्ञान एवं प्रौद्योगिकी',
        'जैव प्रौद्योगिकी',
      ],
      timelineTitle: 'जनसेवा की यात्रा',
      timeline: [
        ['2008', 'रुड़की के नगर पालिका अध्यक्ष चुने गए।'],
        ['2012', 'पहली बार विधायक चुने गए; एक वर्ष तक दोनों दायित्व निभाए।'],
        ['2017–2022', 'उत्तराखंड विधानसभा में रुड़की की जनता की सेवा।'],
        ['2022 से', 'जनसेवा जारी, कैबिनेट मंत्री के दायित्वों सहित।'],
      ],
      photos: {
        '203': 'विधानसभा में रुड़की के मुद्दे उठाते हुए',
        '112': 'बायोटेक भवन की प्रयोगशाला में, पंतनगर',
        '262': 'विकास कार्यों के दौरान मौके पर',
        '241': 'युवा खिलाड़ियों के साथ',
      },
    },
    impact: {
      title: 'लोगों तक पहुँची मदद',
      intro: 'रुड़की स्थित उनके सेवा केंद्र के माध्यम से।',
      stats: [
        ['20,000+', 'लोगों को आर्थिक सहायता'],
        ['12,000+', 'राशन कार्ड बनवाए गए'],
        ['8,000+', 'वृद्धावस्था पेंशन स्वीकृत'],
        ['5,000+', 'नए आयुष्मान कार्ड'],
        ['5,000+', 'वोटर आईडी कार्ड जारी'],
        ['3,000+', 'पुत्री विवाह हेतु आर्थिक सहायता'],
      ],
      note: 'आँकड़े श्री प्रदीप बत्रा की टीम द्वारा दिए गए हैं। श्रेणियों में दोहराव संभव है।',
    },
    work: {
      kicker: 'कैबिनेट मंत्री के रूप में उनका काम',
      note: 'परियोजनाओं की जानकारी श्री प्रदीप बत्रा की टीम द्वारा दी गई है।',
      sources: 'स्रोत और संदर्भ',
      title: 'रुड़की से आगे, पूरे उत्तराखंड में',
      items: [
        {
          icon: 'transport',
          title: 'डिजिटल परिवहन कार्यालय',
          status: 'शुभारंभ',
          body: 'लाइसेंस, परमिट, पंजीकरण और नवीनीकरण ऑनलाइन, स्लॉट बुकिंग, स्थिति और शुल्क भुगतान के साथ।',
        },
        {
          icon: 'ai',
          title: 'आईटी और एआई केंद्र, गौजाजाली (हल्द्वानी)',
          status: 'उद्घाटन',
          body: 'एआई शोध, डिजिटल रोजगार, कौशल और नागरिक केंद्रित सेवाओं के लिए।',
        },
        {
          icon: 'biotech',
          title: 'बायोटेक भवन, पंतनगर',
          status: 'लोकार्पण',
          body: 'छात्रों और शोधकर्ताओं के लिए शोध प्रयोगशालाएँ और संसाधन।',
        },
        {
          icon: 'bus',
          title: 'रुड़की बस अड्डे का उन्नयन',
          status: 'लोकार्पण',
          body: 'लगभग ₹1 करोड़: फीडिंग व प्ले रूम, शौचालय, प्रकाश, आरओ जल, सीसीटीवी और नियमित सफाई।',
        },
        {
          icon: 'health',
          title: 'सिविल अस्पताल में क्रिटिकल केयर ब्लॉक',
          status: 'तैयारी जारी',
          body: '₹20 करोड़ का 50 बेड का ब्लॉक, जिसमें 15 आईसीयू और 25 जनरल बेड।',
        },
        {
          icon: 'bridge',
          title: 'सोलानी नदी का पुल',
          status: 'निर्माणाधीन',
          body: 'कुंभ से पहले पूरा करने का लक्ष्य, अतिरिक्त 15 मीटर स्पान स्वीकृत।',
        },
      ],
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
        [
          'कुछ भी अनदेखा नहीं',
          'समय-सीमा बीतने पर शिकायत अपने आप ऊपर भेजी जाती है, श्री बत्रा की अपनी टीम तक।',
        ],
        ['जन संवाद मुलाकात', 'आमने-सामने मिलने का समय बुक करें और एक दिन पहले याद दिलाने वाला संदेश पाएँ।'],
        ['अपने सुझाव दें', 'अपने क्षेत्र के लिए सुझाव दें और जानें कि क्या तय हुआ।'],
        [
          'सेवाएँ और योजनाएँ',
          '14 सरकारी सेवाओं और 7 योजनाओं की आसान भाषा में जानकारी, आधिकारिक लिंक के साथ।',
        ],
      ],
    },
    how: {
      kicker: 'कैसे काम करता है',
      title: 'शिकायत कैसे आगे बढ़ती है',
      steps: [
        ['आप दर्ज करते हैं', 'समस्या लिखें, फ़ोटो जोड़ें और अपना वार्ड चुनें।'],
        [
          'अधिकारी नियुक्त होता है',
          'श्री बत्रा की टीम स्पष्ट समय-सीमा के साथ इसे ज़िम्मेदार अधिकारी को सौंपती है।',
        ],
        ['काम पूरा होता है', 'अधिकारी पूरे हुए काम की फ़ोटो के साथ समाधान दर्ज करता है।'],
        ['आप पुष्टि करते हैं', 'संतुष्ट हों तो शिकायत बंद करें, वरना दोबारा खोलें।'],
      ],
    },
    gallery: {
      title: 'जनजीवन की झलकियाँ',
      intro:
        'परियोजनाओं, बैठकों और सामुदायिक कार्यक्रमों के एल्बम ऐप में हैं, जिन्हें श्री बत्रा की टीम साझा करती है।',
      captions: {
        '176': 'सेवा केंद्र',
        '269': 'स्वच्छ, हरित शहर',
        '238': 'योग दिवस',
        '179': 'समुदाय और संस्कृति',
        '145': 'रुड़की का विकास',
        '128': 'एचआरडीए खेल परिसर',
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
    cta: {
      title: 'बत्रा कनेक्ट को अपने फ़ोन में रखें',
      body: 'यह निःशुल्क है, हिन्दी और English में है, और ज़रूरत पड़ते ही आपके पास है।',
    },
    footer: {
      tagline:
        'श्री प्रदीप बत्रा की एक स्वतंत्र पहल। यह सरकारी ऐप नहीं है। प्रकाशक: आवास योजना, देहरादून (प्रधानमंत्री आवास योजना या किसी सरकारी योजना से संबंधित नहीं)। WT IT Solutions द्वारा निर्मित और संचालित।',
      privacy: 'गोपनीयता नीति',
      terms: 'उपयोग की शर्तें',
      contact: 'संपर्क',
      staff: 'स्टाफ़ लॉग-इन',
      about: 'ऐप के बारे में और स्रोत',
      deletion: 'अपना खाता हटाएँ',
      rights: 'सर्वाधिकार सुरक्षित।',
    },
  },
} as const;
