import type { Metadata } from 'next';
import { Legal } from '@/site/Legal';
import { site } from '@/site/content';

export const metadata: Metadata = {
  title: 'Terms of use',
  description: 'The terms for using the Batra Connect app.',
  alternates: { canonical: '/terms' },
};

export default function Terms() {
  return (
    <Legal title="Terms of use" updated="15 October 2026">
      <p>
        These terms apply when you use the Batra Connect app and website. By creating an account you agree to
        them.
      </p>

      <h2>What the service is</h2>
      <p>
        Batra Connect lets residents raise local issues, share ideas and request meetings with the office of
        Shri Pradeep Batra. A report in the app is a request for attention. It is not an official government
        application, legal complaint or emergency service.
      </p>
      <p>
        <strong>In an emergency, call 112.</strong> Do not use the app for situations that need immediate
        help.
      </p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>Give accurate information and keep your sign-in details private.</li>
        <li>Report real issues. Do not send false, abusive, threatening or misleading content.</li>
        <li>
          Only upload photos you took or may share, and avoid showing other people&rsquo;s faces or private
          details where you can.
        </li>
        <li>Do not try to access other people&rsquo;s data or interfere with the service.</li>
      </ul>

      <h2>How we handle content</h2>
      <p>
        The office may hide ideas or messages that break these terms, and may suspend accounts that misuse the
        service. Service deadlines shown in the app are targets the office works to, not guarantees.
      </p>

      <h2>Availability</h2>
      <p>
        We aim to keep the service available but cannot promise it will always be uninterrupted. Features may
        change as the service develops.
      </p>

      <h2>Privacy</h2>
      <p>
        How we use your information is explained in the <a href="/privacy">privacy policy</a>.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
      </p>
    </Legal>
  );
}
