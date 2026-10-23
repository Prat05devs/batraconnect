import type { Metadata } from 'next';
import Link from 'next/link';
import { Legal } from '@/site/Legal';
import { site } from '@/site/content';

export const metadata: Metadata = {
  title: 'Terms of use',
  description: 'The terms for using the Batra Connect app and website.',
  alternates: { canonical: '/terms' },
};

export default function Terms() {
  return (
    <Legal title="Terms of use" updated="23 October 2026">
      <p>
        These terms apply when you use the Batra Connect app or the website batraconnect.com. By creating an
        account you agree to them and to the <Link href="/privacy">privacy policy</Link>.
      </p>

      <h2>What Batra Connect is</h2>
      <p>
        Batra Connect is an independent initiative of Shri Pradeep Batra, MLA for Roorkee, built and operated
        by {site.developer} and published by {site.publisher}, {site.publisherNote}. It lets residents report
        local problems, share ideas and request Jan Samvad meetings, and lets Shri Batra&rsquo;s team follow
        up on them.
      </p>
      <p>
        <strong>Batra Connect is not a government app.</strong> It is not run by, endorsed by or acting for
        the Government of Uttarakhand, the Government of India or any government department. A report sent
        through the app is a request for attention. It is not an official government complaint, a legal notice
        or an application for any government service. Information about government services and schemes is a
        plain-language summary with links to the official sources. Always check the official source before you
        apply.
      </p>
      <p>
        <strong>In an emergency, call 112.</strong> Do not use the app for anything that needs immediate help.
      </p>

      <h2>An early version</h2>
      <p>
        This is the first release of Batra Connect. Features may change as it is improved based on feedback.
        Target dates shown for reports are goals that Shri Batra&rsquo;s team works towards, not guarantees.
      </p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>You must be 18 or older, give accurate information and keep your password private.</li>
        <li>Report real issues. Do not send false, abusive, threatening, hateful or misleading content.</li>
        <li>
          Only upload photos you took or may share, and avoid showing other people&rsquo;s faces or private
          details where you can.
        </li>
        <li>Do not try to access other people&rsquo;s data, misuse the service or interfere with it.</li>
      </ul>

      <h2>What you send</h2>
      <p>
        What you send is seen only by Shri Batra&rsquo;s team, the officers given access to resolve it and the
        administrators who run the service, as described in the privacy policy. It is never shown to other
        users. There is no chat, messaging between users or public posting in the app.
      </p>
      <p>
        Content that breaks these terms may be removed, and accounts that misuse the service may be suspended.
        If you see something wrong, write to <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
      </p>

      <h2>Your account</h2>
      <p>
        You can delete your account at any time in the app or by email. See{' '}
        <Link href="/delete-account">Delete your account</Link>.
      </p>

      <h2>Availability and liability</h2>
      <p>
        We aim to keep the service available but cannot promise it will always work without interruption. The
        app is provided free of charge and as it is. To the extent the law allows, neither Shri Pradeep Batra
        nor {site.publisher} nor {site.developer} is responsible for losses caused by its use or
        unavailability.
      </p>

      <h2>Changes and contact</h2>
      <p>
        If we change these terms, we will update the date above and tell you in the app. Questions:{' '}
        <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
      </p>
    </Legal>
  );
}
