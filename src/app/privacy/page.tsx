import type { Metadata } from 'next';
import Link from 'next/link';
import { Legal } from '@/site/Legal';
import { site } from '@/site/content';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description:
    'How the Batra Connect app collects, uses, shares, keeps and deletes your information, and how to delete your account.',
  alternates: { canonical: '/privacy' },
};

const mail = <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>;

export default function Privacy() {
  return (
    <Legal title="Privacy policy" updated="23 October 2026">
      <p>
        This policy explains what information the Batra Connect app and website (batraconnect.com) collect,
        why, who can see it, how long it is kept, and how you can delete it. It is written to meet
        India&rsquo;s Digital Personal Data Protection Act, 2023, the Google Play User Data policy and the
        Apple App Store Review Guidelines.
      </p>

      <h2>In short</h2>
      <ul>
        <li>
          We collect only what is needed to receive your report, idea or meeting request and keep you updated.
        </li>
        <li>
          There are no advertisements, no tracking across other apps or websites, and we never sell data.
        </li>
        <li>Other users cannot see anything you send. The app has no chat, public feed or user profiles.</li>
        <li>
          Your location is attached to a report only when you choose. Photos are cleaned of hidden details.
        </li>
        <li>
          You can download your data or delete your account inside the app at any time, or ask us by email
          (see <Link href="/delete-account">Delete your account</Link>).
        </li>
      </ul>

      <h2>Who we are</h2>
      <p>
        Batra Connect is an independent initiative of Shri Pradeep Batra, MLA for Roorkee, to stay in closer
        touch with residents. <strong>It is not a government app.</strong> It is not run by, and does not
        represent, the Government of Uttarakhand, the Government of India or any government department. The
        app is published by <strong>{site.publisher}</strong>, {site.publisherNote}, and built and operated by
        <strong>{site.developer}</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;) for Shri Pradeep Batra.
      </p>
      <p>Contact for any privacy question, request or complaint: {mail}. We do not offer support by phone.</p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> your name, email address, a password (stored only as a secure
          one-way hash), and, if you add them, your mobile number and preferred language.
        </li>
        <li>
          <strong>What you send:</strong> reports of local problems (category, title, description, district,
          locality and ward), ideas, Jan Samvad meeting requests (subject and notes) and the photos you
          attach.
        </li>
        <li>
          <strong>Precise location, only when you choose:</strong> when you tap &ldquo;Use my current
          location&rdquo; on a report, its position is saved with that report. The app never tracks your
          location in the background.
        </li>
        <li>
          <strong>Photos:</strong> each photo is re-processed on our server, and hidden details such as GPS
          position and camera information are removed before it is stored.
        </li>
        <li>
          <strong>Notifications:</strong> a push-notification token for your device and your notification
          choices (push, email or SMS).
        </li>
        <li>
          <strong>Security records:</strong> your active sign-in sessions (with the device name your phone
          reports) and a record of important account actions with the network (IP) address they came from.
        </li>
      </ul>
      <p>
        We do not collect contacts, call logs, files, health data, financial data or advertising identifiers,
        and we do not use analytics or advertising tools.
      </p>

      <h2>Device permissions</h2>
      <ul>
        <li>
          <strong>Camera and photos:</strong> only to take or choose a photo for a report.
        </li>
        <li>
          <strong>Location:</strong> only when you tap &ldquo;Use my current location&rdquo;.
        </li>
        <li>
          <strong>Notifications:</strong> optional, to tell you about updates on what you sent.
        </li>
      </ul>
      <p>
        Every permission can be refused or withdrawn in your phone&rsquo;s settings. The rest of the app keeps
        working.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>
          to receive your report and pass it to someone who can resolve it, and to tell you about its
          progress;
        </li>
        <li>to escalate reports that pass their target date;</li>
        <li>to arrange Jan Samvad meetings and send reminders;</li>
        <li>to verify your email or mobile number and keep your account secure;</li>
        <li>
          to prepare overall statistics, such as how many reports were resolved on time, that do not identify
          you.
        </li>
      </ul>
      <p>
        We use your information only with your consent, which you give when you create an account and send
        something. You can withdraw it at any time by deleting your account.
      </p>

      <h2>Who can see your information</h2>
      <ul>
        <li>
          <strong>Reports</strong> are seen by Shri Pradeep Batra&rsquo;s team and by the officers given
          access to resolve them, but <strong>without your name or contact details</strong>. Only the
          administrators who run the service can link a report to your account.
        </li>
        <li>
          <strong>Ideas</strong> are seen by Shri Batra&rsquo;s team with your name.{' '}
          <strong>Meeting requests</strong> are seen with your name and mobile number, so the meeting can be
          arranged.
        </li>
        <li>
          <strong>Other users</strong> cannot see anything you send, and you cannot see theirs.
        </li>
        <li>
          <strong>Service providers</strong> that run the service for us: DigitalOcean (servers, database and
          photo storage, in India), Hostinger (website), Expo with Apple and Google (push notifications), and
          our email and SMS delivery providers. They process data only on our instructions and are required to
          protect it at least as well as this policy does.
        </li>
        <li>We disclose information to authorities only when the law requires it.</li>
      </ul>

      <h2>How long we keep it</h2>
      <ul>
        <li>
          <strong>Account details:</strong> until you delete your account.
        </li>
        <li>
          <strong>Sign-in sessions:</strong> expire after 7 days. One-time codes expire after 10 to 30
          minutes.
        </li>
        <li>
          <strong>Photos not attached to a report:</strong> deleted after 24 hours.
        </li>
        <li>
          <strong>Messages we sent you</strong> (email, SMS, notification copies): deleted after 30 days.
        </li>
        <li>
          <strong>Reports:</strong> one year after a report is resolved or closed, its title, description,
          locality, location and photos are deleted.
        </li>
        <li>
          <strong>Security records:</strong> deleted after one year.
        </li>
        <li>
          <strong>Backups:</strong> kept for 14 days, then deleted.
        </li>
      </ul>

      <h2 id="deletion">Deleting your account and data</h2>
      <p>
        In the app, open <strong>Profile → Account and security → Delete account</strong>, enter your password
        and confirm. Your account is deleted immediately. Without the app, email {mail} from the address on
        your account. The full steps are on <Link href="/delete-account">Delete your account</Link>.
      </p>
      <p>When your account is deleted:</p>
      <ul>
        <li>
          <strong>Deleted at once:</strong> your name, email, mobile number and password; all sign-in
          sessions, notification tokens, notification settings and messages; and the subject and notes of your
          meeting requests. Upcoming meetings are cancelled.
        </li>
        <li>
          <strong>Kept without your identity:</strong> reports of public problems you sent, such as a broken
          street light, so that work already under way can be finished. They are no longer linked to you and
          are cleaned up on the schedule above.
        </li>
        <li>
          <strong>Backups:</strong> copies in backups disappear within 14 days.
        </li>
      </ul>

      <h2>Your rights</h2>
      <ul>
        <li>See and correct your details in the app (Account and security).</li>
        <li>Download a copy of your data from the app (Download my data).</li>
        <li>Delete your account and data at any time.</li>
        <li>Choose how you are notified, or turn notifications off.</li>
        <li>
          Raise a question or complaint with us at {mail}. We reply within 7 days and resolve complaints
          within 30 days. If you are not satisfied, you may approach the Data Protection Board of India.
        </li>
      </ul>

      <h2>Security</h2>
      <p>
        All connections are encrypted (HTTPS). Passwords are stored only as secure one-way hashes, sign-in
        attempts and codes are limited, and the server and database are not reachable from the internet except
        through the app&rsquo;s secured interface. No system is perfectly secure. If a breach affects you, we
        will tell you and the authorities as the law requires.
      </p>

      <h2>Children</h2>
      <p>
        Batra Connect is meant for people aged 18 and over. We do not knowingly collect information from
        children. Younger residents should ask a parent or guardian to report on their behalf.
      </p>

      <h2>An early version</h2>
      <p>
        Batra Connect is in its first release. Features may change as we improve it based on feedback, which
        you can send from the app (Profile → Send feedback) or to {mail}. If a change affects how your
        information is used, we will update this page and tell you in the app.
      </p>
    </Legal>
  );
}
