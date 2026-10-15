import Image from 'next/image';
import Link from 'next/link';
import {
  BellRing,
  CalendarDays,
  Camera,
  Check,
  ClipboardList,
  Landmark,
  Lightbulb,
  LocateFixed,
  MapPin,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import { copy, type Lang } from './content';
import { SiteFooter, SiteHeader } from './chrome';

const featureIcons = [Camera, ClipboardList, TrendingUp, CalendarDays, Lightbulb, Landmark];
const trustIcons = [LocateFixed, Camera, SlidersHorizontal];
const officePhotos = ['172', '109', '123'] as const;
const galleryPhotos = ['176', '269', '179', '237', '107', '070'] as const;

function StoreBadge({ store, soon }: { store: string; soon: string }) {
  return (
    <div
      aria-disabled="true"
      className="flex min-w-40 flex-col rounded-xl border border-white/25 bg-white/5 px-4 py-2.5 text-white"
    >
      <span className="text-[11px] uppercase tracking-wider text-white/60">{soon}</span>
      <span className="text-base font-semibold">{store}</span>
    </div>
  );
}

/** Illustrative phone showing a report moving through its stages (not a screenshot). */
function PhoneMock({ lang }: { lang: Lang }) {
  const t = copy[lang].phone;
  return (
    <div
      aria-hidden="true"
      className="w-64 rounded-[2.2rem] border-[10px] border-[#06142f] bg-[#f5f7fb] p-4 shadow-2xl shadow-black/40"
    >
      <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-[#06142f]/80" />
      <p className="text-xs font-medium text-[#53627a]">{t.title}</p>
      <div className="mt-2 rounded-2xl bg-white p-3.5 shadow-sm">
        <p className="font-mono text-[10px] text-[#53627a]">{t.ref}</p>
        <p className="mt-1 text-sm font-semibold text-[#0c2148]">{t.issue}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-[#53627a]">
          <MapPin className="size-3" />
          {t.place}
        </p>
        <span className="mt-3 inline-block rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800">
          {t.due}
        </span>
      </div>
      <ol className="mt-3 space-y-2.5 rounded-2xl bg-white p-3.5 shadow-sm">
        {t.steps.map((step, i) => {
          const done = i < 3;
          return (
            <li key={step} className="flex items-center gap-2.5 text-xs">
              <span
                className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
                  done ? 'bg-[#075bd8] text-white' : 'border-2 border-[#c9d2df]'
                }`}
              >
                {done && <Check className="size-3" strokeWidth={3} />}
              </span>
              <span className={done ? 'font-medium text-[#0c2148]' : 'text-[#53627a]'}>{step}</span>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[#075bd8] p-3 text-xs text-white">
        <BellRing className="size-4 shrink-0" />
        {t.steps[2]}
      </div>
    </div>
  );
}

function SectionHeading({ kicker, title, intro }: { kicker?: string; title: string; intro?: string }) {
  return (
    <div className="max-w-2xl">
      {kicker && <p className="text-sm font-semibold uppercase tracking-wider text-[#075bd8]">{kicker}</p>}
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#0c2148] sm:text-4xl">{title}</h2>
      {intro && <p className="mt-3 text-lg text-[#53627a]">{intro}</p>}
    </div>
  );
}

function Photo({ id, caption, className = '' }: { id: string; caption: string; className?: string }) {
  return (
    <figure className={`group relative overflow-hidden rounded-2xl bg-[#eef1f6] ${className}`}>
      <Image
        src={`/photos/${id}.jpg`}
        alt={caption}
        fill
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover transition duration-500 group-hover:scale-[1.03]"
      />
      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pt-8 pb-2.5 text-sm font-medium text-white">
        {caption}
      </figcaption>
    </figure>
  );
}

export function Landing({ lang }: { lang: Lang }) {
  const t = copy[lang];
  const cap = t.gallery.captions;
  return (
    <div lang={lang} className="bg-white text-[#0c2148]">
      <SiteHeader lang={lang} />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#0c2148] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(7,91,216,0.55),transparent_55%)]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:py-24">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-medium">
                <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
                {t.hero.badge}
              </p>
              <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-[#8fb8ff]">
                {t.hero.eyebrow}
              </p>
              <h1 className="mt-3 text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
                {t.hero.title}
              </h1>
              <p className="mt-5 max-w-xl text-lg text-white/80">{t.hero.body}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <StoreBadge store={t.hero.play} soon={t.hero.soon} />
                <StoreBadge store={t.hero.appStore} soon={t.hero.soon} />
              </div>
              <p className="mt-4 text-sm text-white/60">{t.hero.note}</p>
            </div>
            <div className="relative mx-auto flex items-end gap-4 sm:gap-6">
              <PhoneMock lang={lang} />
              <div className="mb-10 hidden w-44 overflow-hidden rounded-2xl bg-white text-[#0c2148] shadow-xl sm:block">
                <Image
                  src="/brand/pradeep-batra.jpg"
                  alt={lang === 'hi' ? 'श्री प्रदीप बत्रा' : 'Shri Pradeep Batra'}
                  width={485}
                  height={632}
                  className="h-48 w-full object-cover object-top"
                  priority
                />
                <div className="p-3">
                  <p className="text-sm font-semibold">
                    {lang === 'hi' ? 'श्री प्रदीप बत्रा' : 'Shri Pradeep Batra'}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-[#53627a]">{t.office.role}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What's inside */}
        <section id="features" className="scroll-mt-16 bg-[#f5f7fb] py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading kicker={t.features.kicker} title={t.features.title} intro={t.features.intro} />
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {t.features.items.map(([title, body], i) => {
                const Icon = featureIcons[i];
                return (
                  <div key={title} className="rounded-2xl border border-[#d9e0eb] bg-white p-6">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-[#eaf2ff] text-[#075bd8]">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                    <p className="mt-2 text-[#53627a]">{body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-16 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading kicker={t.how.kicker} title={t.how.title} />
            <ol className="mt-10 grid gap-6 md:grid-cols-4">
              {t.how.steps.map(([title, body], i) => (
                <li key={title} className="relative">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#075bd8] font-bold text-white">
                      {i + 1}
                    </span>
                    {i < t.how.steps.length - 1 && (
                      <span className="hidden h-0.5 flex-1 bg-[#d9e0eb] md:block" />
                    )}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <p className="mt-1.5 text-[#53627a]">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* The office */}
        <section className="bg-[#f5f7fb] py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
            <Photo id="028" caption={cap['028']} className="aspect-[524/500]" />
            <div>
              <SectionHeading title={t.office.title} />
              <p className="mt-4 text-lg text-[#53627a]">{t.office.body}</p>
              <div className="mt-8 grid grid-cols-3 gap-3">
                {officePhotos.map(id => (
                  <Photo key={id} id={id} caption={cap[id]} className="aspect-square text-xs" />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Gallery */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading title={t.gallery.title} intro={t.gallery.intro} />
            <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3">
              {galleryPhotos.map(id => (
                <Photo key={id} id={id} caption={cap[id]} className="aspect-[4/3]" />
              ))}
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section className="bg-[#0c2148] py-20 text-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-7 text-[#8fb8ff]" />
              <h2 className="text-3xl font-bold tracking-tight">{t.trust.title}</h2>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {t.trust.items.map(([title, body], i) => {
                const Icon = trustIcons[i];
                return (
                  <div key={title} className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
                    <Icon className="size-5 text-[#8fb8ff]" />
                    <h3 className="mt-3 font-semibold">{title}</h3>
                    <p className="mt-1.5 text-white/70">{body}</p>
                  </div>
                );
              })}
            </div>
            <Link
              href="/privacy"
              className="mt-8 inline-block font-semibold text-[#8fb8ff] underline-offset-4 hover:underline"
            >
              {t.trust.link} →
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter lang={lang} />
    </div>
  );
}
