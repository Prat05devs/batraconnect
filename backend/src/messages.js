const status = {
  Submitted: 'प्राप्त',
  Assigned: 'सौंपी गई',
  'In progress': 'कार्य जारी',
  Resolved: 'समाधान दर्ज',
  Closed: 'बंद',
  Reopened: 'फिर खोली गई',
  'Under review': 'समीक्षा में',
  Accepted: 'स्वीकृत',
  Implemented: 'लागू',
  'Not taken forward': 'आगे नहीं बढ़ाया गया',
  Hidden: 'प्रकाशित नहीं',
  Requested: 'अनुरोधित',
  Confirmed: 'पुष्ट',
  Declined: 'अस्वीकृत',
  Cancelled: 'रद्द',
  Completed: 'पूर्ण',
  Missed: 'उपस्थित नहीं',
};
const hi = value => status[value] ?? value;
const minutes = m => ({ en: `${m} minutes`, hi: `${m} मिनट` });
/** Notification and one-time-code text in the account's chosen language. */
export const messages = {
  complaintStatus: (ref, s) => ({
    en: `Report ${ref}: status is now ${s}.`,
    hi: `रिपोर्ट ${ref}: स्थिति अब "${hi(s)}" है।`,
  }),
  complaintEscalated: (ref, level) => ({
    en: `Report ${ref} is past its service deadline (escalation level ${level}).`,
    hi: `रिपोर्ट ${ref} समय-सीमा से आगे है (एस्केलेशन स्तर ${level})।`,
  }),
  complaintAssignedToYou: ref => ({
    en: `Report ${ref} has been assigned to you.`,
    hi: `रिपोर्ट ${ref} आपको सौंपी गई है।`,
  }),
  complaintNew: (ref, category) => ({
    en: `New report ${ref} in ${category}.`,
    hi: `${category} में नई रिपोर्ट ${ref}।`,
  }),
  ideaStatus: (ref, s) => ({ en: `Your idea ${ref}: ${s}.`, hi: `आपका सुझाव ${ref}: ${hi(s)}।` }),
  appointmentStatus: (ref, s) => ({
    en: `Jan Samvad appointment ${ref}: ${s}.`,
    hi: `जन संवाद मुलाकात ${ref}: ${hi(s)}।`,
  }),
  appointmentReminder: (ref, when, place) => ({
    en: `Reminder: Jan Samvad appointment ${ref} on ${when} at ${place}.`,
    hi: `याद दिलाना: जन संवाद मुलाकात ${ref}, ${when}, स्थान ${place}।`,
  }),
  appointmentSlotCancelled: ref => ({
    en: `Your Jan Samvad appointment ${ref} was cancelled by the office. Please choose another time.`,
    hi: `कार्यालय ने आपकी जन संवाद मुलाकात ${ref} रद्द की। कृपया दूसरा समय चुनें।`,
  }),
  code: (purpose, value, ttl) => {
    const valid = minutes(ttl);
    const text = {
      verify_email: ['verify your email', 'अपना ईमेल सत्यापित करने'],
      verify_phone: ['verify your mobile number', 'अपना मोबाइल नंबर सत्यापित करने'],
      reset_password: ['reset your password', 'अपना पासवर्ड बदलने'],
      login: ['sign in', 'लॉगिन करने'],
    }[purpose];
    return {
      en: `Batra Connect code to ${text[0]}: ${value}. Valid for ${valid.en}. Do not share this code.`,
      hi: `बत्रा कनेक्ट में ${text[1]} का कोड: ${value}। ${valid.hi} तक मान्य। यह कोड किसी को न बताएँ।`,
    };
  },
  invite: (value, hours) => ({
    en: `You have been given a Batra Connect staff account. Use "Forgot password" with this email and code ${value} within ${hours} hours to set your password.`,
    hi: `आपको बत्रा कनेक्ट स्टाफ खाता दिया गया है। ${hours} घंटे के भीतर इसी ईमेल और कोड ${value} से "पासवर्ड भूल गए" में पासवर्ड बनाएँ।`,
  }),
};
export const subjects = {
  code: { en: 'Your Batra Connect code', hi: 'आपका बत्रा कनेक्ट कोड' },
  update: { en: 'Batra Connect update', hi: 'बत्रा कनेक्ट अपडेट' },
  invite: { en: 'Your Batra Connect staff account', hi: 'आपका बत्रा कनेक्ट स्टाफ खाता' },
};
