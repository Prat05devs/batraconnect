/** Curated summaries from the linked primary sources, reviewed 8 October 2026.
 * This is a bundled reference catalogue, not a live eligibility or application service.
 */
export const schemeCategories = [
  'All',
  'Pensions',
  'Women & children',
  'Self-employment',
  'Agriculture',
] as const;
export type SchemeCategory = (typeof schemeCategories)[number];
export type Scheme = {
  id: string;
  name: string;
  hindiName: string;
  category: Exclude<SchemeCategory, 'All'>;
  scope: 'Uttarakhand' | 'Central';
  summary: string;
  benefit: string;
  eligibility: string[];
  documents: string[];
  documentsNote?: string;
  howToApply: string;
  application?: { label: string; url: string; verificationNote?: string };
  source: { title: string; publisher: string; url: string; checkedOn: string; edition?: string };
  aliases: string[];
};
const checkedOn = '2026-10-08';
export const schemes: Scheme[] = [
  {
    id: 'old-age-pension',
    name: 'Old Age Pension Scheme',
    hindiName: 'वृद्धावस्था पेंशन योजना',
    category: 'Pensions',
    scope: 'Uttarakhand',
    summary: 'Monthly support for qualifying senior citizens.',
    benefit: '₹1,500 per month for eligible beneficiaries.',
    eligibility: [
      'Age 60 or above.',
      'Monthly income from all sources up to ₹4,000, or a BPL card.',
      'Selection through the Gram Sabha process described by the department.',
    ],
    documents: [
      'Income certificate or BPL card',
      'Family register (rural) or ration card (urban)',
      'Gram Panchayat / councillor selection proposal',
      'Certified photograph',
      'CBS bank passbook and Aadhaar',
    ],
    howToApply:
      'Use the department pension portal, UMANG or Apuni Sarkar. Follow the official form’s instructions.',
    application: {
      label: 'Open pension portal',
      url: 'https://ssp.uk.gov.in/',
      verificationNote: 'Linked by the department; portal availability was not confirmed during review.',
    },
    source: {
      title: 'Old Age Pension Scheme',
      publisher: 'Social Welfare Department, Uttarakhand',
      url: 'https://socialwelfare.uk.gov.in/service/old-age-pension/',
      checkedOn,
    },
    aliases: ['senior citizen', 'elderly', 'vridhavastha', 'budhapa'],
  },
  {
    id: 'widow-pension',
    name: 'Widow Pension Scheme',
    hindiName: 'विधवा पेंशन योजना',
    category: 'Pensions',
    scope: 'Uttarakhand',
    summary: 'Pension application support for qualifying widows.',
    benefit: 'Pension support. The reviewed department page does not state an amount.',
    eligibility: [
      'Applicant is a widow aged 18 or above.',
      'Monthly income up to ₹4,000, or a BPL card.',
      'Gram Sabha selection and the husband’s death certificate are required by the listed process.',
    ],
    documents: [
      'Income certificate or BPL card',
      'Family register (rural) or ration card (urban)',
      'Husband’s death certificate',
      'Selection proposal and certified photograph',
      'CBS bank passbook and Aadhaar',
    ],
    howToApply: 'Use the online widow-pension form linked by the Social Welfare Department.',
    application: {
      label: 'Open official pension form',
      url: 'https://ssp.uk.gov.in/OnlineRegistration/FrmWidowOnlineApplicationForm.aspx',
      verificationNote:
        'Department-provided link; the form itself was not independently loaded during review.',
    },
    source: {
      title: 'Widow Pension Scheme',
      publisher: 'Social Welfare Department, Uttarakhand',
      url: 'https://socialwelfare.uk.gov.in/service/widow-pension/',
      checkedOn,
    },
    aliases: ['vidhwa', 'widows'],
  },
  {
    id: 'mahalakshmi-kit',
    name: 'Chief Minister Mahalakshmi Kit Scheme',
    hindiName: 'मुख्यमंत्री महालक्ष्मी किट योजना',
    category: 'Women & children',
    scope: 'Uttarakhand',
    summary: 'Care-kit support for mothers and newborn babies.',
    benefit: 'A maternal and newborn care kit; the department describes nutritional supplements.',
    eligibility: [
      'The department lists pregnant women and lactating mothers as beneficiaries.',
      'Confirm local registration requirements at your Anganwadi centre.',
    ],
    documents: [],
    documentsNote:
      'The source does not publish a document checklist. Ask the Anganwadi centre what is required.',
    howToApply: 'Visit the Anganwadi centre in your area and register.',
    source: {
      title: 'Chief Minister Mahalakshmi Kit Scheme',
      publisher: 'Women Empowerment & Child Development, Uttarakhand',
      url: 'https://wecd.uk.gov.in/scheme/chief-minister-mahalakshmi-kit-scheme/',
      checkedOn,
    },
    aliases: ['mahalaxmi', 'pregnancy', 'pregnant', 'newborn', 'mother'],
  },
  {
    id: 'amrit-anchal',
    name: 'Amrit Anchal Scheme',
    hindiName: 'अमृत आंचल योजना',
    category: 'Women & children',
    scope: 'Uttarakhand',
    summary: 'Nutrition support for children registered with Anganwadi centres.',
    benefit: 'Milk-powder distribution to enrolled children aged 3–6.',
    eligibility: ['Child is aged 3–6.', 'Child is registered at an Anganwadi centre.'],
    documents: [],
    documentsNote: 'No document checklist is published on the reviewed page. Confirm it at the centre.',
    howToApply: 'Visit the nearest Anganwadi centre and register the child.',
    source: {
      title: 'Amrit Anchal Scheme',
      publisher: 'Women Empowerment & Child Development, Uttarakhand',
      url: 'https://wecd.uk.gov.in/scheme/amrit-anchal-scheme/',
      checkedOn,
    },
    aliases: ['milk', 'anganwadi', 'nutrition', 'child', 'children'],
  },
  {
    id: 'mahila-poshan',
    name: 'Mukhyamantri Mahila Poshan Scheme',
    hindiName: 'मुख्यमंत्री महिला पोषण योजना',
    category: 'Women & children',
    scope: 'Uttarakhand',
    summary: 'Nutrition support for pregnant and lactating women.',
    benefit: 'Nutritious food through the scheme’s local delivery process.',
    eligibility: [
      'Pregnant women and lactating mothers are the listed beneficiaries.',
      'Registration is required to receive benefits.',
    ],
    documents: [],
    documentsNote:
      'The reviewed source has no document checklist. Confirm local requirements at your Anganwadi centre.',
    howToApply:
      'Visit an Anganwadi centre and register. Confirm the current local delivery arrangements there.',
    source: {
      title: 'Mukhyamantri Mahila Poshan Scheme',
      publisher: 'Women Empowerment & Child Development, Uttarakhand',
      url: 'https://wecd.uk.gov.in/scheme/mukhyamantri-mahila-poshan-scheme/',
      checkedOn,
    },
    aliases: ['maternal', 'pregnancy', 'pregnant', 'food', 'nutrition', 'mother'],
  },
  {
    id: 'msy-2',
    name: 'Mukhyamantri Swarojgar Yojana 2.0',
    hindiName: 'मुख्यमंत्री स्वरोजगार योजना 2.0',
    category: 'Self-employment',
    scope: 'Uttarakhand',
    summary: 'Bank-linked support for establishing an eligible enterprise.',
    benefit:
      'Bank finance and conditional margin-money subsidy; rates vary by project cost and location. This is not a guaranteed cash grant.',
    eligibility: [
      'Age 18 or above; permanent/native Uttarakhand resident.',
      'Not a defaulter of a recognised bank or government institution.',
      'One beneficiary per defined family, once under this scheme.',
      'Prior self-employment benefits, permitted activities and project viability are subject to the full notification.',
    ],
    documents: [
      'Aadhaar and residence certificate',
      'Project report',
      'Recent passport photograph',
      'Eligibility affidavit and applicable category certificates',
    ],
    documentsNote: 'Summary only; see the notification for the full list and conditional documents.',
    howToApply:
      'The notification specifies online submission on the designated portal. Ask the District Industries Centre for the current application route.',
    source: {
      title: 'MSY 2.0 notification (PDF)',
      publisher: 'Government of Uttarakhand, MSME Department',
      url: 'https://startuputtarakhand.uk.gov.in/attachments/MSY.pdf',
      checkedOn,
      edition: 'March 2025; scheme period 2025–26 to 2029–30 unless amended or discontinued',
    },
    aliases: ['msy', 'business', 'entrepreneur', 'swarojgar', 'loan', 'employment'],
  },
  {
    id: 'pm-kisan',
    name: 'PM-KISAN Samman Nidhi',
    hindiName: 'प्रधानमंत्री किसान सम्मान निधि',
    category: 'Agriculture',
    scope: 'Central',
    summary: 'Income support for qualifying landholding farmer families.',
    benefit: '₹6,000 per year in three equal instalments through direct bank transfer.',
    eligibility: [
      'Landholding farmer families, subject to the scheme’s exclusions.',
      'State eligibility verification and Aadhaar-related checks apply.',
      'Income-tax and pensioner exclusion checks are part of the official process; consult the full rules.',
    ],
    documents: [],
    documentsNote:
      'NIC’s overview does not give a complete checklist. Consult the official registration form for required records.',
    howToApply:
      'Register through the PM-KISAN portal/mobile app or a Common Service Centre; the state verifies eligibility.',
    application: {
      label: 'Open PM-KISAN portal',
      url: 'https://pmkisan.gov.in/',
      verificationNote: 'Linked by NIC; portal availability was not confirmed during review.',
    },
    source: {
      title: 'PM-KISAN project overview',
      publisher: 'National Informatics Centre, Government of India',
      url: 'https://www.nic.gov.in/project/pm-kisan/',
      checkedOn,
      edition: 'Source footer: updated 27 May 2026',
    },
    aliases: ['farmer', 'farmers', 'kisan', 'agriculture', 'खेती'],
  },
];
export function filterSchemes(
  query: string,
  category: SchemeCategory = 'All',
  scope: 'All' | Scheme['scope'] = 'All',
): Scheme[] {
  const terms = query.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return schemes.filter(scheme => {
    const text = [scheme.name, scheme.hindiName, scheme.category, scheme.summary, ...scheme.aliases]
      .join(' ')
      .normalize('NFKC')
      .toLocaleLowerCase();
    return (
      (category === 'All' || scheme.category === category) &&
      (scope === 'All' || scheme.scope === scope) &&
      terms.every(term => text.includes(term))
    );
  });
}
export const getScheme = (id: string) => schemes.find(scheme => scheme.id === id);
