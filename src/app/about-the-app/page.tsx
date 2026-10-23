import type { Metadata } from 'next';
import Link from 'next/link';
import { Legal } from '@/site/Legal';
import { site } from '@/site/content';

export const metadata: Metadata = {
  title: 'About the app and sources',
  description:
    'Who runs Batra Connect, why it is not a government app, where its information comes from, and how to reach us.',
  alternates: { canonical: '/about-the-app' },
};

/** Official portals the app's service and scheme guides link to (app/src/content/services.ts and schemes.ts). */
const officialSources = [
  ['Uttarakhand Transport Department', 'https://transport.uk.gov.in'],
  ['Parivahan Sarathi (driving licences)', 'https://sarathi.parivahan.gov.in'],
  ['Parivahan Vahan (vehicle registration)', 'https://vahan.parivahan.gov.in'],
  ['Apuni Sarkar portal (citizen services)', 'https://eservices.uk.gov.in'],
  ['CM Helpline Uttarakhand (official grievances)', 'https://cmhelpline.uk.gov.in'],
  ['Social Welfare Department, Uttarakhand (pensions)', 'https://socialwelfare.uk.gov.in'],
  ['Uttarakhand pension application portal', 'https://ssp.uk.gov.in'],
  ['Women Empowerment and Child Development, Uttarakhand', 'https://wecd.uk.gov.in'],
  ['Information Technology Department, Uttarakhand', 'https://it.uk.gov.in'],
  ['Startup Uttarakhand', 'https://startuputtarakhand.uk.gov.in'],
  ['Uttarakhand Council for Biotechnology', 'https://ucb.ac.in'],
  ['PM-KISAN', 'https://pmkisan.gov.in'],
  ['National Informatics Centre', 'https://www.nic.gov.in'],
] as const;

const references = [
  [
    'Hon’ble Ministers — Chief Minister’s Office, Uttarakhand (roles and departments)',
    'https://cm.uk.gov.in/cabinet-minister/',
  ],
  ['Pradeep Batra — PRS Legislative Research (MLA record)', 'https://prsindia.org/mlatrack/pradeep-batra-1'],
  [
    'Pradip Batra — Wikipedia (election history, with Election Commission sources)',
    'https://en.wikipedia.org/wiki/Pradip_Batra',
  ],
  [
    'Roorkee Assembly constituency — Wikipedia',
    'https://en.wikipedia.org/wiki/Roorkee_Assembly_constituency',
  ],
] as const;

const ExternalList = ({ items }: { items: readonly (readonly [string, string])[] }) => (
  <ul>
    {items.map(([label, url]) => (
      <li key={url}>
        <a href={url} target="_blank" rel="noopener noreferrer">
          {label}
        </a>{' '}
        <span className="text-sm text-[#53627a]">({new URL(url).hostname})</span>
      </li>
    ))}
  </ul>
);

export default function AboutTheApp() {
  return (
    <Legal title="About Batra Connect" updated="23 October 2026">
      <h2>Not a government app</h2>
      <p>
        <strong>
          Batra Connect is an independent initiative of Shri Pradeep Batra. It is not a government app.
        </strong>{' '}
        It is not run by, endorsed by or acting for the Government of Uttarakhand, the Government of India or
        any government department, and it does not provide any government service. To apply for a government
        service or raise an official complaint, use the official portals listed below.
      </p>

      <h2>Why it exists</h2>
      <p>
        Shri Pradeep Batra, MLA for Roorkee, started Batra Connect to stay in closer touch with residents.
        People can report local problems with a photo, follow them until they are resolved, share ideas and
        request Jan Samvad meetings. Shri Batra&rsquo;s team receives what is sent in a private dashboard and
        passes it to the people who can act on it. Residents cannot message each other, and nothing anyone
        sends is shown publicly.
      </p>
      <p>
        This is the first version of the app. It will be improved based on what residents tell us, so please{' '}
        <a href={`mailto:${site.contactEmail}?subject=${encodeURIComponent('Batra Connect feedback')}`}>
          send your feedback
        </a>
        .
      </p>

      <h2>Who builds and runs it</h2>
      <p>
        The app is published by <strong>{site.publisher}</strong>, {site.publisherNote}. The app and this
        website are built and operated by <strong>{site.developer}</strong> for Shri Pradeep Batra. Support is
        by email only, at <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>. There is no phone
        helpline.
      </p>

      <h2 id="sources">Where the information comes from</h2>
      <ul>
        <li>
          <strong>About Shri Pradeep Batra, his work, figures and photographs:</strong> provided to{' '}
          {site.developer} by Shri Pradeep Batra and his team. Figures are as reported by them. His roles and
          departments can be checked in the public references below.
        </li>
        <li>
          <strong>Government services and schemes:</strong> plain-language summaries prepared from the
          official government websites below, which the app links to on every guide. The official website is
          always the final word. Check it before you apply.
        </li>
      </ul>

      <h3 className="mt-6 font-semibold text-[#0c2148]">Public references</h3>
      <ExternalList items={references} />

      <h3 className="mt-6 font-semibold text-[#0c2148]">
        Official government websites used for service and scheme guides
      </h3>
      <ExternalList items={officialSources} />

      <h2>Your privacy</h2>
      <p>
        Read how your information is handled in the <Link href="/privacy">privacy policy</Link>, and how to
        delete your account on <Link href="/delete-account">Delete your account</Link>.
      </p>
    </Legal>
  );
}
