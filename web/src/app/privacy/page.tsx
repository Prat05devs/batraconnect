import type { Metadata } from 'next';
import { Legal } from '@/site/Legal';
import { site } from '@/site/content';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'How the Batra Connect app collects, uses and protects your information.',
  alternates: { canonical: '/privacy' },
};

export default function Privacy() {
  return (
    <Legal title="Privacy policy" updated="15 October 2026">
      <p>
        Batra Connect is an app that connects residents with the office of Shri Pradeep Batra (Cabinet
        Minister, Government of Uttarakhand, and MLA for Roorkee). This policy explains what information the
        app collects, why, who can see it, and the choices you have. It is written to meet India&rsquo;s
        Digital Personal Data Protection Act, 2023.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> your name, email address and, if you add it, your mobile number,
          and the language you prefer.
        </li>
        <li>
          <strong>What you send us:</strong> reports (category, title, description, district, locality and
          ward), ideas, appointment requests, and the photos you attach.
        </li>
        <li>
          <strong>Location, only when you choose:</strong> your position is attached to a report only when you
          tap &ldquo;Use my current location&rdquo;. The app does not track you in the background.
        </li>
        <li>
          <strong>Photos:</strong> every photo is re-processed on our server and hidden details such as the
          GPS position and camera information are removed before it is stored.
        </li>
        <li>
          <strong>Notifications:</strong> a device token so we can send push notifications, and your
          notification choices.
        </li>
        <li>
          <strong>Security records:</strong> sign-in sessions (with the device name your phone reports) and,
          for staff actions, a record of who changed what and when.
        </li>
      </ul>
      <p>
        We do not use advertising, we do not sell data, and we do not use your information to build profiles.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>
          to route your report to the responsible officer and department, and to tell you about its progress;
        </li>
        <li>to escalate reports that pass their service deadline;</li>
        <li>to manage Jan Samvad appointments and send reminders;</li>
        <li>to verify your email or mobile number and to keep your account secure;</li>
        <li>to produce statistics for the office, for example how many reports were resolved on time.</li>
      </ul>

      <h2>Who can see your information</h2>
      <ul>
        <li>
          <strong>Your reports</strong> are visible to the field officer assigned to them, to department
          officers responsible for that district and category, to the minister&rsquo;s office and to the
          administrators who run the service. They are never shown publicly.
        </li>
        <li>
          <strong>Appointment requests</strong> (including your name and mobile number) are visible to the
          office staff who arrange the meeting.
        </li>
        <li>
          <strong>Service providers</strong> process data only to run the service: Supabase (database and
          photo storage), Hostinger (hosting), Expo (push notifications) and our email and SMS providers.
        </li>
        <li>We share information with other authorities only where the law requires it.</li>
      </ul>

      <h2>How long we keep it</h2>
      <ul>
        <li>
          One-time codes expire after a short time and are erased once sent. Sign-in sessions end after seven
          days.
        </li>
        <li>Photos you upload but never attach to a report are deleted after one day.</li>
        <li>
          Reports are kept as a record of public service. When you delete your account, your name and contact
          details are removed and your reports stay with the office without your identity.
        </li>
      </ul>

      <h2>Your rights and choices</h2>
      <ul>
        <li>See and correct your details in the app (Account).</li>
        <li>Choose push, email or SMS notifications.</li>
        <li>Download a copy of your data from the app.</li>
        <li>Delete your account from the app at any time.</li>
        <li>
          Ask a question or raise a concern by writing to{' '}
          <a href={`mailto:${site.privacyEmail}`}>{site.privacyEmail}</a>.
        </li>
      </ul>

      <h2>Security</h2>
      <p>
        All connections are encrypted. Passwords are stored only as secure one-way hashes, sign-in codes are
        limited in number and attempts, and staff can only see reports for the areas they are responsible for.
        No system is perfectly secure; if we become aware of a breach that affects you, we will inform you and
        the authorities as the law requires.
      </p>

      <h2>Children</h2>
      <p>
        Batra Connect is intended for people aged 18 and over. Younger residents should ask a parent or
        guardian to report on their behalf.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy, we will update the date above and, for significant changes, tell you in the
        app.
      </p>
    </Legal>
  );
}
