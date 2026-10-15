/** Reviewed public summaries bundled for offline reading. No live application integration. */
export const reviewedOn = '2026-10-08';
export type Reference = { title: string; publisher: string; url: string };
export type ServiceTask = {
  id: string;
  department: string;
  title: string;
  summary: string;
  audience: string;
  documents: string[];
  steps: string[];
  note: string;
  references: Reference[];
  transaction?: { kind: 'application' | 'form' | 'grievance'; label: string; url: string };
};
const transport = (title: string, path: string): Reference => ({
  title,
  publisher: 'Uttarakhand Transport Department',
  url: `https://transport.uk.gov.in/${path}/`,
});
const it = (title: string, path: string): Reference => ({
  title,
  publisher: 'Department of IT, Good Governance & Science Technology',
  url: `https://it.uk.gov.in/${path}/`,
});
const licence = transport('Licence application instructions', 'license');
const registration = transport('Registration documents', 'registration');
const sarathi = {
  kind: 'application' as const,
  label: 'Continue application on Sarathi',
  url: 'https://sarathi.parivahan.gov.in/sarathiservice/stateSelection.do',
};
const vahan = {
  kind: 'application' as const,
  label: 'Continue application on Vahan',
  url: 'https://vahan.parivahan.gov.in/vahanservice/vahan/ui/statevalidation/homepage.xhtml',
};
const feeNote =
  'Fees and any required appointments are confirmed by the official portal. Keep the acknowledgement and payment receipt. This app does not submit or pay for you.';
export const serviceTasks: ServiceTask[] = [
  {
    id: 'learner-licence',
    department: 'transport',
    title: 'Get a learner licence',
    summary: 'Prepare documents, apply and arrange the learner test.',
    audience:
      'New learners. Eligibility depends on age and vehicle class; the portal confirms the applicable requirements.',
    documents: [
      'Date-of-birth and address proof',
      'Form 1 self-declaration; other documents requested by Sarathi',
    ],
    steps: [
      'Select Uttarakhand on Sarathi and choose Apply for Learner Licence.',
      'Verify your mobile number; enter applicant, address, vehicle class and office details.',
      'Complete Form 1, submit and keep the acknowledgement.',
      'Upload documents, pay the fee and book a test slot.',
      'Attend with original documents, Form 1 and fee receipt.',
    ],
    note: feeNote,
    references: [licence],
    transaction: sarathi,
  },
  {
    id: 'driving-licence',
    department: 'transport',
    title: 'Apply for a driving licence',
    summary: 'Move from your learner licence to a driving test.',
    audience: 'Learner licence holders; the department also lists foreign and defence licence routes.',
    documents: [
      'Learner licence or documents for your selected route',
      'Original documents, Form 2 and fee receipt for the office visit',
    ],
    steps: [
      'Select Uttarakhand on Sarathi; choose Apply for Driving Licence.',
      'Provide your existing licence details and verify applicant information.',
      'Submit, retain the acknowledgement and upload required documents.',
      'Pay the fee, book the test and attend with originals.',
    ],
    note: feeNote,
    references: [licence],
    transaction: sarathi,
  },
  {
    id: 'licence-services',
    department: 'transport',
    title: 'Renew or update a driving licence',
    summary: 'Renewal, duplicate licence, address changes and international driving permits.',
    audience: 'Existing driving licence holders; requirements differ by service.',
    documents: ['Driving licence details', 'Service-specific supporting documents requested by Sarathi'],
    steps: [
      'Select Uttarakhand and Services on Driving Licence.',
      'Enter licence number and date of birth; retrieve and verify details.',
      'Verify the mobile number and select the required service.',
      'Upload documents and pay. Book a slot if required and retain receipts.',
    ],
    note: feeNote,
    references: [transport('Licence-related services', 'service/license-related-services'), licence],
    transaction: sarathi,
  },
  {
    id: 'renew-registration',
    department: 'transport',
    title: 'Renew vehicle registration',
    summary: 'Documents and preparation for RC renewal.',
    audience:
      'Vehicle owners needing registration renewal; the portal confirms applicable renewal and inspection requirements.',
    documents: [
      'Form 25 and registration certificate (RC)',
      'Insurance and pollution-under-control (PUC) certificate',
      'Address proof and fee receipt',
    ],
    steps: [
      'Prepare the listed documents.',
      'Open Vahan, select Uttarakhand and the registration-renewal service.',
      'Follow the portal’s verification, document and payment instructions.',
      'Keep the acknowledgement; attend inspection if instructed.',
    ],
    note: `${feeNote} These are preparation steps; the portal supplies the transaction-specific workflow.`,
    references: [registration, transport('Vehicle-related services', 'service/vehicle-related-services')],
    transaction: vahan,
  },
  {
    id: 'transfer-vehicle',
    department: 'transport',
    title: 'Transfer vehicle ownership',
    summary: 'Prepare the seller and buyer documents for an ownership transfer.',
    audience: 'Vehicle buyers and sellers. Additional requirements may apply to interstate transfers.',
    documents: [
      'Forms 29 and 30; RC and insurance',
      'Buyer and seller photographs; tax clearance',
      'NOC when the vehicle is from outside Uttarakhand; prescribed fee',
    ],
    steps: [
      'Collect documents from both parties.',
      'Choose the ownership-transfer service on Vahan for Uttarakhand.',
      'Follow verification, upload and payment instructions.',
      'Keep the acknowledgement and comply with any office requirements.',
    ],
    note: `${feeNote} These are preparation steps; the portal supplies the transaction-specific workflow.`,
    references: [registration, transport('Vehicle-related services', 'service/vehicle-related-services')],
    transaction: vahan,
  },
  {
    id: 'duplicate-rc',
    department: 'transport',
    title: 'Replace a lost registration certificate',
    summary: 'Prepare a duplicate RC application.',
    audience: 'Vehicle owners whose RC is lost.',
    documents: [
      'Form 26, insurance and fee receipt',
      'FIR copy; affidavit that the RC is lost and has not been impounded',
    ],
    steps: [
      'Prepare the listed documents.',
      'Select the Duplicate RC service on Vahan for Uttarakhand.',
      'Complete the portal’s checks, upload and payment instructions.',
      'Keep the acknowledgement and follow any office instructions.',
    ],
    note: `${feeNote} Preparation guide; additional requirements may depend on your case.`,
    references: [registration],
    transaction: vahan,
  },
  {
    id: 'rc-address',
    department: 'transport',
    title: 'Change the address on your RC',
    summary: 'Update the address in a vehicle registration record.',
    audience: 'Vehicle owners whose address has changed.',
    documents: ['Form 33, RC, insurance and PUC', 'New address proof and fee receipt'],
    steps: [
      'Prepare the listed documents.',
      'Select Change of Address on Vahan for Uttarakhand.',
      'Follow verification, document-upload and payment instructions.',
      'Retain the acknowledgement and comply with any office requirements.',
    ],
    note: `${feeNote} Preparation guide; the portal confirms the transaction workflow.`,
    references: [registration],
    transaction: vahan,
  },
  {
    id: 'apuni-sarkar',
    department: 'it',
    title: 'Apply for a public service or certificate',
    summary: 'Apuni Sarkar brings departmental services into one citizen portal.',
    audience: 'Citizens applying directly or with an e-District Centre / Common Service Centre.',
    documents: [
      'Documents depend on the selected service; there is no single checklist for every certificate.',
    ],
    steps: [
      'Identify the certificate or departmental service you need.',
      'Open Apuni Sarkar; use Citizen Login or sign up. JanParichay is also listed.',
      'Select the service and read its eligibility and document requirements before submitting.',
      'Keep the application reference. Use application status and certificate download when available.',
    ],
    note: 'Service-specific eligibility, fees and delivery times are not verified here. Confirm these in the selected application. Batra Connect does not create a portal account or issue certificates.',
    references: [
      it('Apuni Sarkar', 'apuni-sarkar'),
      {
        title: 'Citizen portal',
        publisher: 'Government of Uttarakhand',
        url: 'https://eservices.uk.gov.in/',
      },
    ],
    transaction: { kind: 'application', label: 'Apply on Apuni Sarkar', url: 'https://eservices.uk.gov.in/' },
  },
  {
    id: 'cm-helpline',
    department: 'it',
    title: 'Register a grievance with CM Helpline',
    summary: 'The official helpline accepts grievances, suggestions and feedback. Toll-free: 1905.',
    audience: 'People seeking an official government grievance channel.',
    documents: [
      'Prepare a clear description, department if known and location; the official channel will request any additional details.',
    ],
    steps: [
      'Write down the issue, location and what help you need.',
      'Register through the CM Helpline portal or call 1905.',
      'Keep any reference provided by the official channel.',
      'Use that channel for follow-up and feedback.',
    ],
    note: 'These are preparation steps. Reports saved locally in Batra Connect are not registered with CM Helpline.',
    references: [it('CM Helpline', 'cm-helpline')],
    transaction: {
      kind: 'grievance',
      label: 'Register on CM Helpline',
      url: 'https://cmhelpline.uk.gov.in/',
    },
  },
  {
    id: 'biotech-training',
    department: 'biotechnology',
    title: 'Biotechnology training & dissertation',
    summary:
      'Laboratory training in tissue culture, molecular biology, environmental biotechnology, hydroponics and bioinformatics.',
    audience:
      'Biotechnology, microbiology and allied-science graduates/postgraduates: short training of 30/45–90 days. The 180-day dissertation is for postgraduates.',
    documents: [
      'Completed proforma with photograph and attested educational certificates',
      'Forwarding signature and seal from your HOD / institution',
    ],
    steps: [
      'Confirm current intake, dates and fees with the council: 05944-230567; statebiotech@rediffmail.com.',
      'Download the proforma; fill it by hand in capital letters and sign.',
      'Attach certificates and obtain institutional forwarding.',
      'Send or submit the hard copy addressed to the Director. Confirm the postal address first.',
    ],
    note: 'Current admission availability is not verified. The webpage lists Biotech Bhavan, Haldi, Pantnagar, U. S. Nagar, PIN 263145; the older form lists 263146. Confirm the address before posting. The fee document linked by the council is dated 2021; current fees need confirmation.',
    references: [
      {
        title: 'Training programme',
        publisher: 'Uttarakhand Council for Biotechnology',
        url: 'https://ucb.ac.in/six-months-dissertation-and-others-skill-development-training-programs/',
      },
      {
        title: 'Application proforma',
        publisher: 'Uttarakhand Council for Biotechnology',
        url: 'https://ucb.ac.in/wp-content/uploads/2020/10/Dissertation-cum-Short-term-Training-Proforma.pdf',
      },
    ],
    transaction: {
      kind: 'form',
      label: 'Download application form (PDF)',
      url: 'https://ucb.ac.in/wp-content/uploads/2020/10/Dissertation-cum-Short-term-Training-Proforma.pdf',
    },
  },
  {
    id: 'science-enterprise',
    department: 'science',
    title: 'Science entrepreneurship support',
    summary: 'UCOST’s EDP supports technology resource centres and entrepreneurship development.',
    audience: 'NGOs and scientific institutes listed as beneficiaries. A current call determines selection.',
    documents: [
      'A verified current application checklist has not been published in this app. Obtain the call’s required proposal and supporting-document list.',
    ],
    steps: [
      'Identify how your proposal uses local resources or improves post-harvest technology.',
      'Obtain an open UCOST call and its eligibility and document requirements.',
      'Prepare the proposal through your organisation. The published programme accepts online applications on a call basis.',
    ],
    note: 'This is preparation guidance. No active call, application endpoint, deadline or funding amount has been verified. An Apply button will be added only after the submission destination is confirmed.',
    references: [
      it('Entrepreneurship Development Programme', 'scheme/entrepreneurship-development-programme-edp'),
    ],
  },
  {
    id: 'science-travel',
    department: 'science',
    title: 'Research travel support',
    summary: 'Selective UCOST support for international conferences and training.',
    audience:
      'Scientists in Uttarakhand academic institutions and research laboratories. The published page lists an accepted presentation or an invitation to chair or give a keynote; training applicants must be below 40.',
    documents: [
      'Prepare the paper acceptance or invitation relevant to your request.',
      'Obtain the current call’s complete checklist before applying.',
    ],
    steps: [
      'Check that the event and your role meet the current call.',
      'The published page requires no UCOST assistance in the previous three years and receipt through the proper channel at least eight weeks before the event.',
      'Confirm current guidelines, then prepare the online application specified by an open call.',
    ],
    note: 'This is preparation guidance. A current call, submission endpoint and award amount are not verified. The source includes older airline-booking wording; confirm current travel and reimbursement rules before booking. Support is selective, not guaranteed.',
    references: [it('Travel grant support', 'scheme/travel-grant-support')],
  },
  {
    id: 'science-programmes',
    department: 'science',
    title: 'Explore science programmes',
    summary:
      'UCOST lists research and development, science popularization, travel-grant support and entrepreneurship programmes.',
    audience: 'Students, researchers, faculty and institutions exploring science opportunities.',
    documents: ['No verified current application checklist is available in this catalogue.'],
    steps: [
      'Identify whether your interest is research, science outreach, travel support or entrepreneurship.',
      'Prepare a short description of your project or proposed activity.',
      'Obtain current guidelines and an open call from UCOST before preparing a funding application.',
    ],
    note: 'The public programme listing is informational. Its science-popularization page has old dates and an incomplete How To Apply section. Current deadlines, eligibility, grant amounts and submission routes need departmental confirmation; no Apply button is shown.',
    references: [
      it('UCOST programmes', 'provider/ucost-scheme'),
      it('Science popularization', 'scheme/science-popularization-program'),
    ],
  },
];
export const departmentGuides: Record<
  string,
  { overview: string; facts: string[]; references: Reference[] }
> = {
  transport: {
    overview:
      'Prepare for licence and vehicle services here, then continue on Sarathi or Vahan when you are ready to apply.',
    facts: [
      'Licence applications use Sarathi; vehicle transactions use Vahan.',
      'Some services require a test or office visit.',
    ],
    references: [licence, registration],
  },
  it: {
    overview: 'Find the route to public certificates, digital services and official grievance registration.',
    facts: [
      'Apuni Sarkar supports direct citizen access and assisted service centres.',
      'CM Helpline: toll-free 1905.',
    ],
    references: [it('Apuni Sarkar', 'apuni-sarkar'), it('CM Helpline', 'cm-helpline')],
  },
  biotechnology: {
    overview:
      'The council supports biotechnology education and research, including practical training and postgraduate dissertation work.',
    facts: ['Council phone: 05944-230567', 'Email: statebiotech@rediffmail.com'],
    references: [serviceTasks.find(t => t.id === 'biotech-training')!.references[0]],
  },
  science: {
    overview: 'Explore Uttarakhand’s science and technology programmes and public initiatives.',
    facts: [
      'UCOST lists Lab on Wheels, STEM & Innovation Corners and Science Corridor among its services.',
      'Programme availability must be checked against a current departmental call.',
    ],
    references: [it('UCOST services', 'ucost-service'), it('UCOST programmes', 'provider/ucost-scheme')],
  },
  minister: {
    overview:
      'Shri Pradeep Batra is listed as Cabinet Minister and MLA for Roorkee in the official minister directory.',
    facts: [
      'Transport',
      'Information Technology and Good Governance',
      'Science and Technology',
      'Biotechnology',
    ],
    references: [
      {
        title: 'Cabinet minister directory',
        publisher: 'Chief Minister Office, Uttarakhand',
        url: 'https://cm.uk.gov.in/cabinet-minister/',
      },
    ],
  },
};
/** Search aliases are editorial navigation vocabulary, not additional programme claims. */
const searchAliases: Record<string, string[]> = {
  'learner-licence': ['learning license', 'लर्नर', 'लाइसेंस', 'सीखने'],
  'driving-licence': ['driving license', 'ड्राइविंग', 'लाइसेंस'],
  'licence-services': ['license renewal', 'लाइसेंस नवीनीकरण', 'international permit'],
  'renew-registration': ['rc renewal', 'पंजीकरण नवीनीकरण', 'आरसी नवीनीकरण'],
  'transfer-vehicle': ['ownership', 'वाहन हस्तांतरण'],
  'duplicate-rc': ['duplicate rc', 'lost rc', 'खोई आरसी', 'डुप्लीकेट आरसी'],
  'rc-address': ['rc address', 'आरसी पता', 'पता बदलना'],
  'apuni-sarkar': ['certificate', 'प्रमाणपत्र', 'अपुणि सरकार', 'apuni'],
  'cm-helpline': ['1905', 'हेल्पलाइन', 'शिकायत पंजीकरण'],
  'biotech-training': ['biotechnology', 'dissertation', 'जैव प्रौद्योगिकी', 'प्रशिक्षण'],
  'science-programmes': ['ucost', 'विज्ञान'],
  'science-enterprise': ['edp', 'entrepreneurship', 'उद्यमिता'],
  'science-travel': ['travel grant', 'conference', 'यात्रा अनुदान'],
};
function normalizeSearch(query: string) {
  return query
    .normalize('NFKC')
    .toLocaleLowerCase('en-IN')
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
export function searchServiceTasks(query: string, savedOnly: boolean, bookmarks: string[]) {
  const terms = normalizeSearch(query).split(' ').filter(Boolean);
  return serviceTasks.filter(task => {
    if (savedOnly && !bookmarks.includes(task.department)) return false;
    const content = normalizeSearch(
      [task.title, task.summary, ...task.documents, ...(searchAliases[task.id] ?? [])].join(' '),
    );
    return terms.every(term => content.includes(term));
  });
}
export function searchDepartments<T extends { id: string; title: string; detail: string }>(
  query: string,
  savedOnly: boolean,
  bookmarks: string[],
  sources: T[],
) {
  const term = normalizeSearch(query);
  const taskDepartments = new Set(
    searchServiceTasks(query, savedOnly, bookmarks).map(task => task.department),
  );
  return sources.filter(
    source =>
      (!savedOnly || bookmarks.includes(source.id)) &&
      (normalizeSearch(`${source.title} ${source.detail}`).includes(term) || taskDepartments.has(source.id)),
  );
}
