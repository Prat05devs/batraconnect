// Public website pages the app links to. The stores require the privacy policy and the account-deletion
// steps to be reachable from inside the app as well as from the store listing.
import { Linking } from 'react-native';

export const WEBSITE = 'https://batraconnect.com';
export const links = {
  privacy: `${WEBSITE}/privacy`,
  terms: `${WEBSITE}/terms`,
  deleteAccount: `${WEBSITE}/delete-account`,
  about: `${WEBSITE}/about-the-app`,
  /** WT IT Solutions builds and runs the app; support is by email only. */
  feedback: 'mailto:admin@wtsolutions.cc?subject=Batra%20Connect%20feedback',
} as const;
export const open = (url: string) => void Linking.openURL(url);

/** Shown in the app and on every store listing: who runs Batra Connect, and that it is not a government app. */
export const disclaimer = {
  en: 'Batra Connect is an independent initiative of Shri Pradeep Batra. It is not a government app and is not run by the Government of Uttarakhand or any government department. Information about government services and schemes is summarised from official government websites, linked in each guide. Published by Awas Yojana, Dehradun, an independent organisation not connected with Pradhan Mantri Awas Yojana or any government scheme. Built and run by WT IT Solutions.',
  hi: 'बत्रा कनेक्ट श्री प्रदीप बत्रा की एक स्वतंत्र पहल है। यह सरकारी ऐप नहीं है और इसे उत्तराखंड सरकार या कोई सरकारी विभाग नहीं चलाता। सरकारी सेवाओं और योजनाओं की जानकारी आधिकारिक सरकारी वेबसाइटों से संक्षेप में ली गई है, जिनके लिंक हर गाइड में हैं। प्रकाशक: आवास योजना, देहरादून, एक स्वतंत्र संस्था जो प्रधानमंत्री आवास योजना या किसी सरकारी योजना से संबंधित नहीं है। WT IT Solutions द्वारा निर्मित और संचालित।',
};
