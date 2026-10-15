import type { Metadata } from 'next';
import { Landing } from '@/site/Landing';

export const metadata: Metadata = {
  title: 'बत्रा कनेक्ट — जल्द आ रहा है',
  description:
    'स्थानीय समस्याएँ दर्ज करें, समाधान तक नज़र रखें और श्री प्रदीप बत्रा के कार्यालय से जुड़े रहें।',
  alternates: { canonical: '/hi', languages: { en: '/' } },
};

export default function HindiHome() {
  return <Landing lang="hi" />;
}
