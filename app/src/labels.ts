import { ApiError } from './api-client.ts';
type Language = 'en' | 'hi';
const statuses: Record<string, string> = {
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
  draft: 'ड्राफ्ट',
  published: 'प्रकाशित',
  archived: 'संग्रहित',
  active: 'सक्रिय',
  suspended: 'निलंबित',
  citizen: 'नागरिक',
  field: 'फील्ड अधिकारी',
  department: 'विभाग / नोडल',
  executive: 'कार्यकारी / मंत्री',
  admin: 'प्रशासक',
  submitted: 'प्राप्त',
  assigned: 'सौंपी गई',
  reassigned: 'फिर सौंपी गई',
  status_changed: 'स्थिति बदली',
  escalated: 'एस्केलेट',
  reviewed: 'समीक्षा',
  moderated: 'मॉडरेट',
};
const roleNames: Record<string, string> = {
  citizen: 'Citizen',
  field: 'Field officer',
  department: 'Department / nodal',
  executive: 'Executive / minister',
  admin: 'Administrator',
};
const actionNames: Record<string, string> = {
  submitted: 'Submitted',
  assigned: 'Assigned',
  reassigned: 'Reassigned',
  status_changed: 'Status changed',
  escalated: 'Escalated',
  reviewed: 'Reviewed',
  moderated: 'Moderated',
};
export const statusLabel = (value: string, language: Language) =>
  language === 'hi' ? (statuses[value] ?? value) : value;
export const roleLabel = (role: string, language: Language) =>
  language === 'hi' ? (statuses[role] ?? role) : (roleNames[role] ?? role);
export const actionLabel = (action: string, language: Language) =>
  language === 'hi' ? (statuses[action] ?? action) : (actionNames[action] ?? action);
/** Hindi for every server error code the app can receive; English uses the server's own message. */
const errors: Record<string, string> = {
  NETWORK_ERROR: 'कनेक्ट नहीं हो सका। इंटरनेट कनेक्शन जाँचें और फिर प्रयास करें।',
  RATE_LIMITED: 'बहुत अधिक अनुरोध। कुछ देर बाद प्रयास करें।',
  REQUEST_FAILED: 'अनुरोध पूरा नहीं हो सका।',
  INVALID_RESPONSE: 'सर्वर से अमान्य उत्तर मिला।',
  SERVER_ERROR: 'सर्वर यह अनुरोध पूरा नहीं कर सका। बाद में प्रयास करें।',
  UNAUTHENTICATED: 'कृपया फिर लॉगिन करें।',
  FORBIDDEN: 'आपको यह कार्य करने की अनुमति नहीं है।',
  NOT_FOUND: 'यह जानकारी उपलब्ध नहीं है।',
  VALIDATION_ERROR: 'कुछ जानकारी सही नहीं है। फ़ील्ड जाँचें और फिर प्रयास करें।',
  INVALID_CREDENTIALS: 'ईमेल या पासवर्ड सही नहीं है।',
  ACCOUNT_SUSPENDED: 'यह खाता निलंबित है। बत्रा कनेक्ट कार्यालय से संपर्क करें।',
  EMAIL_EXISTS: 'इस ईमेल से पहले ही खाता है। कृपया लॉगिन करें।',
  PHONE_EXISTS: 'इस मोबाइल नंबर से पहले ही खाता है।',
  INVALID_CODE: 'कोड गलत है या समाप्त हो गया है। नया कोड मँगाएँ।',
  TOO_MANY_CODES: 'बहुत अधिक कोड माँगे गए। एक घंटे बाद प्रयास करें।',
  PHONE_REQUIRED: 'पहले अपने खाते में मोबाइल नंबर जोड़ें।',
  ALREADY_VERIFIED: 'यह संपर्क पहले से सत्यापित है।',
  VERIFICATION_REQUIRED: 'भेजने से पहले अपना ईमेल या मोबाइल नंबर सत्यापित करें।',
  STAFF_ACCOUNT: 'स्टाफ खाते प्रशासक द्वारा बंद किए जाते हैं।',
  IDEMPOTENCY_CONFLICT: 'यह अनुरोध किसी अन्य रिपोर्ट के लिए उपयोग हुआ था।',
  INVALID_MEDIA: 'कोई फोटो उपलब्ध नहीं है या पहले से जुड़ी है।',
  INVALID_PHOTO: 'JPEG, PNG, WebP या AVIF फोटो (10 MB तक) चुनें।',
  INVALID_UPLOAD: 'एक फोटो (10 MB तक) अपलोड करें।',
  UPLOAD_QUOTA: 'बहुत सी फोटो बिना भेजे पड़ी हैं। पहले वर्तमान रिपोर्ट भेजें।',
  PHOTO_REQUIRED: 'एक फोटो चुनें।',
  INVALID_CATEGORY: 'उपलब्ध श्रेणी चुनें।',
  INVALID_DISTRICT: 'उत्तराखंड का जिला चुनें।',
  INVALID_WARD: 'उपलब्ध वार्ड चुनें।',
  VERSION_CONFLICT: 'यह जानकारी बदल गई है। रीफ्रेश करके फिर प्रयास करें।',
  IDEMPOTENCY_REQUIRED: 'अनुरोध कुंजी आवश्यक है। फिर से भेजें।',
  INVALID_JSON: 'अनुरोध में मान्य JSON होना चाहिए।',
  FEATURE_OFF: 'यह सेवा अभी उपलब्ध नहीं है। कृपया बाद में प्रयास करें।',
  NO_HISTORY: 'पुराना संस्करण उपलब्ध नहीं है।',
  CODE_NOT_RESENT: 'कोड दोबारा नहीं भेजे जाते। ऐप में नया कोड माँगें।',
  USE_ACCOUNT_PAGE: 'अपना पासवर्ड खाता पृष्ठ से बदलें।',
  OVERSIGHT_ONLY:
    'यह खाता निगरानी के लिए है। रिपोर्ट, सुझाव और बुकिंग निवासी या अधिकारी खातों से भेजी जाती हैं।',
  OWN_REPORT:
    'आप अपनी भेजी रिपोर्ट, सुझाव या मुलाकात पर कार्रवाई नहीं कर सकते। इसे कोई दूसरा अधिकारी संभालेगा।',
  INVALID_STATE: 'इस चरण में यह कार्य उपलब्ध नहीं है।',
  TRANSITION_DENIED: 'आपकी भूमिका या वर्तमान चरण में यह बदलाव संभव नहीं है।',
  INVALID_ASSIGNEE: 'इस जिले और श्रेणी के लिए ज़िम्मेदार फील्ड अधिकारी चुनें।',
  EVIDENCE_REQUIRED: 'पूरा हुआ कार्य दिखाने वाली कम से कम एक फोटो जोड़ें।',
  IDEA_LIMIT: 'आप एक दिन में 10 सुझाव भेज सकते हैं।',
  SLOT_UNAVAILABLE: 'यह समय अब उपलब्ध नहीं है। दूसरा समय चुनें।',
  SLOT_FULL: 'यह समय पूरी तरह बुक है। दूसरा समय चुनें।',
  ALREADY_BOOKED: 'इस समय आपकी पहले से मुलाकात है।',
  APPOINTMENT_LIMIT: 'आप 3 आगामी मुलाकातें रख सकते हैं। नई बुक करने के लिए एक रद्द करें।',
  SAME_SLOT: 'कोई दूसरा समय चुनें।',
  INVALID_SLOT: 'भविष्य का समय चुनें।',
  SELF_CHANGE: 'आप अपनी भूमिका या स्थिति नहीं बदल सकते।',
  CITIZEN_ROLE: 'नागरिक खाते को स्टाफ में नहीं बदला जा सकता।',
  JURISDICTION_REQUIRED: 'फील्ड और विभाग स्टाफ के लिए कम से कम एक जिला और श्रेणी चुनें।',
  CONFLICT: 'यह रिकॉर्ड पहले से मौजूद है।',
  ORIGIN_DENIED: 'यह वेब पता अनुमत नहीं है।',
  BODY_TOO_LARGE: 'अनुरोध बहुत बड़ा है।',
};
export function errorText(
  error: unknown,
  language: Language,
  fallback = 'Something went wrong. Please try again.',
) {
  if (error instanceof ApiError)
    return language === 'hi' ? (errors[error.code] ?? errors.REQUEST_FAILED) : error.message;
  if (error instanceof Error && error.message)
    return language === 'hi' ? 'कुछ गलत हुआ। फिर प्रयास करें।' : error.message;
  return language === 'hi' ? 'कुछ गलत हुआ। फिर प्रयास करें।' : fallback;
}
export const errorCodes = Object.keys(errors);
