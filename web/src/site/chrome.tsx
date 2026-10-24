import Link from 'next/link';
import { copy, site, type Lang } from './content';

const ADMIN_URL = '/admin';

export function SiteHeader({ lang }: { lang: Lang }) {
  const t = copy[lang].nav;
  const home = lang === 'hi' ? '/hi' : '/';
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0c2148]/95 text-white backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={home} className="text-lg font-semibold tracking-tight">
          {site.name}
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          <a
            href={`${home}#features`}
            className="hidden rounded-md px-3 py-2 text-white/80 hover:text-white md:block"
          >
            {t.features}
          </a>
          <a
            href={`${home}#about`}
            className="hidden rounded-md px-3 py-2 text-white/80 hover:text-white md:block"
          >
            {t.about}
          </a>
          <a
            href={`${home}#how`}
            className="hidden rounded-md px-3 py-2 text-white/80 hover:text-white md:block"
          >
            {t.how}
          </a>
          <Link
            href="/privacy"
            className="hidden rounded-md px-3 py-2 text-white/80 hover:text-white sm:block"
          >
            {t.privacy}
          </Link>
          <Link
            href={t.switchHref}
            hrefLang={lang === 'hi' ? 'en' : 'hi'}
            className="rounded-full border border-white/25 px-3.5 py-1.5 font-medium hover:bg-white/10"
          >
            {t.switchLang}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ lang }: { lang: Lang }) {
  const t = copy[lang].footer;
  return (
    <footer className="border-t border-white/15 bg-[#0c2148] text-white/80">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="text-lg font-semibold text-white">{site.name}</p>
          <p className="mt-3 max-w-sm text-sm">{t.tagline}</p>
        </div>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <li>
            <Link href="/privacy" className="hover:text-white">
              {t.privacy}
            </Link>
          </li>
          <li>
            <Link href="/terms" className="hover:text-white">
              {t.terms}
            </Link>
          </li>
          <li>
            <a href={`mailto:${site.contactEmail}`} className="hover:text-white">
              {t.contact}
            </a>
          </li>
          <li>
            <Link href="/about-the-app" className="hover:text-white">
              {t.about}
            </Link>
          </li>
          <li>
            <Link href="/delete-account" className="hover:text-white">
              {t.deletion}
            </Link>
          </li>
          <li>
            <a href={ADMIN_URL} rel="nofollow" className="hover:text-white">
              {t.staff}
            </a>
          </li>
        </ul>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-white/60 sm:px-6">
          © {new Date().getFullYear()} {site.name}. {t.rights}
        </p>
      </div>
    </footer>
  );
}
