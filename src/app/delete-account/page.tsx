import type { Metadata } from 'next';
import Link from 'next/link';
import { Legal } from '@/site/Legal';
import { site } from '@/site/content';

export const metadata: Metadata = {
  title: 'Delete your account',
  description: 'How to delete your Batra Connect account and data, in the app or by email.',
  alternates: { canonical: '/delete-account' },
};

const subject = encodeURIComponent('Delete my Batra Connect account');
const body = encodeURIComponent(
  'Please delete my Batra Connect account and its data.\n\nEmail or mobile number on the account: \nName on the account: \n',
);

/** The account-deletion page that Google Play requires: reachable without the app, naming the app and developer. */
export default function DeleteAccount() {
  return (
    <Legal title="Delete your Batra Connect account" updated="23 October 2026">
      <p>
        This page explains how to delete your account in the <strong>Batra Connect</strong> app, developed by{' '}
        <strong>{site.developer}</strong> and published on Google Play by <strong>{site.publisher}</strong>,
        and what happens to your data. Deletion is free and cannot be undone.
      </p>

      <h2>Option 1: in the app (immediate)</h2>
      <ul>
        <li>Open Batra Connect and sign in.</li>
        <li>
          Go to <strong>Profile</strong>, then <strong>Account and security</strong>.
        </li>
        <li>
          Tap <strong>Delete account</strong>, enter your password and tap{' '}
          <strong>Permanently delete account</strong>.
        </li>
      </ul>
      <p>Your account is deleted at once and you are signed out on every device.</p>

      <h2>Option 2: without the app (by email)</h2>
      <p>
        If you no longer have the app or cannot sign in,{' '}
        <a href={`mailto:${site.contactEmail}?subject=${subject}&body=${body}`}>email {site.contactEmail}</a>{' '}
        with the subject &ldquo;Delete my Batra Connect account&rdquo;. Send it from the email address on your
        account, or include the mobile number on it. To protect you, we may ask you to confirm the request
        with a one-time code. We delete the account within 7 days of confirming and reply to tell you it is
        done.
      </p>

      <h2>What is deleted</h2>
      <ul>
        <li>Your name, email address, mobile number and password.</li>
        <li>All sign-in sessions, notification tokens, notification settings and messages sent to you.</li>
        <li>The subject and notes of your Jan Samvad meeting requests. Upcoming meetings are cancelled.</li>
      </ul>

      <h2>What is kept, and for how long</h2>
      <ul>
        <li>
          <strong>Reports of public problems</strong> you sent (for example, a broken street light) are kept{' '}
          <strong>without your name or contact details</strong>, so that work already under way can be
          finished. One year after each report is resolved or closed, its title, description, location and
          photos are deleted.
        </li>
        <li>
          <strong>Ideas</strong> you sent are kept without your name, showing only &ldquo;Deleted
          account&rdquo;.
        </li>
        <li>
          <strong>Security records</strong> of account actions are kept for one year, to protect the service
          against misuse.
        </li>
        <li>
          <strong>Backups</strong> that contain your data are deleted within 14 days.
        </li>
      </ul>

      <h2>Only want some data removed?</h2>
      <p>
        You can download your data in the app (<strong>Account and security → Download my data</strong>). To
        remove a specific report, idea or photo without deleting your account, email{' '}
        <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> and tell us which one.
      </p>

      <h2>Staff accounts</h2>
      <p>
        Accounts given to Shri Batra&rsquo;s team or to officers are closed by an administrator. Ask the
        administrator, or email {site.contactEmail}.
      </p>

      <p>
        More detail is in the <Link href="/privacy#deletion">privacy policy</Link>.
      </p>
    </Legal>
  );
}
