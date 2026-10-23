import Image from 'next/image';
import Link from 'next/link';
import {
  Bus,
  BrainCircuit,
  CalendarDays,
  Camera,
  ClipboardList,
  FlaskConical,
  HeartPulse,
  Landmark,
  Lightbulb,
  LocateFixed,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  Waypoints,
  Smartphone,
} from 'lucide-react';
import { copy, type Lang } from './content';
import { SiteFooter, SiteHeader } from './chrome';
import { HeroShowcase, StoreBadge } from './HeroShowcase';

const featureIcons = [Camera, ClipboardList, TrendingUp, CalendarDays, Lightbulb, Landmark];
const trustIcons = [LocateFixed, Camera, SlidersHorizontal];
const workIcons = {
  transport: Smartphone,
  ai: BrainCircuit,
  biotech: FlaskConical,
  bus: Bus,
  health: HeartPulse,
  bridge: Waypoints,
} as const;
const galleryPhotos = ['176', '269', '238', '179', '145', '128'] as const;

function SectionHeading({ kicker, title, intro }: { kicker?: string; title: string; intro?: string }) {
  return (
    <div className="max-w-2xl">
      {kicker && <p className="text-sm font-semibold uppercase tracking-wider text-[#075bd8]">{kicker}</p>}
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-balance text-[#0c2148] sm:text-4xl">
        {title}
      </h2>
      {intro && <p className="mt-3 text-lg text-[#53627a]">{intro}</p>}
    </div>
  );
}

function Photo({
  id,
  caption,
  className = '',
  sizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
}: {
  id: string;
  caption: string;
  className?: string;
  sizes?: string;
}) {
  return (
    <figure className={`group relative overflow-hidden rounded-2xl bg-[#eef1f6] ${className}`}>
      <Image
        src={`/photos/${id}.jpg`}
        alt={caption}
        fill
        sizes={sizes}
        className="object-cover transition duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
      />
      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pt-10 pb-2.5 text-sm font-medium text-white">
        {caption}
      </figcaption>
    </figure>
  );
}

export function Landing({ lang }: { lang: Lang }) {
  const t = copy[lang];
  const aboutPhotos = t.about.photos;
  return (
    <div lang={lang} className="bg-white text-[#0c2148]">
      <SiteHeader lang={lang} />
      <main>
        <HeroShowcase lang={lang} />

        {/* Why keep it: the everyday moments the app is there for */}
        <section id="features" className="scroll-mt-16 bg-[#f5f7fb] py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading kicker={t.moments.kicker} title={t.moments.title} intro={t.moments.intro} />
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {t.moments.items.map(m => (
                <article
                  key={m.title}
                  className="flex flex-col overflow-hidden rounded-2xl border border-[#d9e0eb] bg-white"
                >
                  <div className="relative aspect-[16/10] bg-[#eef1f6]">
                    <Image
                      src={`/photos/${m.photo}.jpg`}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="text-lg font-semibold">{m.title}</h3>
                    <p className="mt-2 flex-1 text-[#53627a]">{m.body}</p>
                    <p className="mt-4 text-sm font-semibold text-[#075bd8]">{m.tag} →</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* About Shri Pradeep Batra */}
        <section id="about" className="scroll-mt-16 py-20">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:items-start">
            <div className="grid grid-cols-2 gap-3">
              <Photo
                id="203"
                caption={aboutPhotos['203']}
                className="col-span-2 aspect-[16/9]"
                sizes="(min-width: 1024px) 45vw, 100vw"
              />
              <Photo
                id="112"
                caption={aboutPhotos['112']}
                className="aspect-[4/3]"
                sizes="(min-width: 1024px) 22vw, 50vw"
              />
              <Photo
                id="262"
                caption={aboutPhotos['262']}
                className="aspect-[4/3]"
                sizes="(min-width: 1024px) 22vw, 50vw"
              />
              <Photo
                id="241"
                caption={aboutPhotos['241']}
                className="col-span-2 aspect-[16/7]"
                sizes="(min-width: 1024px) 45vw, 100vw"
              />
            </div>
            <div>
              <SectionHeading kicker={t.about.kicker} title={t.about.title} />
              <p className="mt-1.5 font-medium text-[#075bd8]">{t.about.role}</p>
              <p className="mt-5 text-lg text-[#53627a]">{t.about.body}</p>
              <h3 className="mt-8 text-sm font-semibold uppercase tracking-wider text-[#53627a]">
                {t.about.departmentsTitle}
              </h3>
              <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
                {t.about.departments.map(d => (
                  <li key={d} className="border-l-2 border-[#075bd8] pl-3 font-medium">
                    {d}
                  </li>
                ))}
              </ul>
              <h3 className="mt-8 text-sm font-semibold uppercase tracking-wider text-[#53627a]">
                {t.about.timelineTitle}
              </h3>
              <ol className="mt-4 space-y-0">
                {t.about.timeline.map(([year, text], i) => (
                  <li key={year} className="relative flex gap-4 pb-6 last:pb-0">
                    {i < t.about.timeline.length - 1 && (
                      <span className="absolute top-3 left-[5px] h-full w-0.5 bg-[#d9e0eb]" />
                    )}
                    <span className="relative mt-1.5 size-3 shrink-0 rounded-full bg-[#075bd8] ring-4 ring-[#eaf2ff]" />
                    <div>
                      <p className="text-sm font-bold text-[#075bd8]">{year}</p>
                      <p className="mt-0.5 text-[#0c2148]">{text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Impact figures from the service centre */}
        <section className="bg-[#0c2148] py-16 text-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight">{t.impact.title}</h2>
            <p className="mt-2 text-white/70">{t.impact.intro}</p>
            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-3 lg:grid-cols-6">
              {t.impact.stats.map(([value, label]) => (
                <div key={label} className="border-l-2 border-[#075bd8] pl-4">
                  <dt className="sr-only">{label}</dt>
                  <dd className="text-3xl font-bold tracking-tight tabular-nums">{value}</dd>
                  <dd className="mt-1 text-sm leading-snug text-white/70">{label}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-8 text-xs text-white/50">{t.impact.note}</p>
          </div>
        </section>

        {/* Work across Uttarakhand */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading kicker={t.work.kicker} title={t.work.title} />
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {t.work.items.map(w => {
                const Icon = workIcons[w.icon];
                return (
                  <div key={w.title} className="rounded-2xl border border-[#d9e0eb] p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex size-11 items-center justify-center rounded-xl bg-[#eaf2ff] text-[#075bd8]">
                        <Icon className="size-5" />
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#53627a]">
                        {w.status}
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">{w.title}</h3>
                    <p className="mt-2 text-[#53627a]">{w.body}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-6 text-sm text-[#53627a]">
              {t.work.note}{' '}
              <Link
                href="/about-the-app#sources"
                className="font-semibold text-[#075bd8] underline-offset-4 hover:underline"
              >
                {t.work.sources} →
              </Link>
            </p>
          </div>
        </section>

        {/* What's inside */}
        <section className="bg-[#f5f7fb] py-20">
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

        {/* Gallery */}
        <section className="bg-[#f5f7fb] py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading title={t.gallery.title} intro={t.gallery.intro} />
            <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3">
              {galleryPhotos.map(id => (
                <Photo key={id} id={id} caption={t.gallery.captions[id]} className="aspect-[4/3]" />
              ))}
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-7 text-[#075bd8]" />
              <h2 className="text-3xl font-bold tracking-tight">{t.trust.title}</h2>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {t.trust.items.map(([title, body], i) => {
                const Icon = trustIcons[i];
                return (
                  <div key={title} className="rounded-2xl border border-[#d9e0eb] p-6">
                    <Icon className="size-5 text-[#075bd8]" />
                    <h3 className="mt-3 font-semibold">{title}</h3>
                    <p className="mt-1.5 text-[#53627a]">{body}</p>
                  </div>
                );
              })}
            </div>
            <Link
              href="/privacy"
              className="mt-8 inline-block font-semibold text-[#075bd8] underline-offset-4 hover:underline"
            >
              {t.trust.link} →
            </Link>
          </div>
        </section>

        {/* Closing call to keep the app */}
        <section className="relative overflow-hidden bg-[#0c2148] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_80%,rgba(7,91,216,0.55),transparent_55%)]" />
          <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">{t.cta.title}</h2>
              <p className="mt-3 text-lg text-white/75">{t.cta.body}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <StoreBadge store={t.hero.play} soon={t.hero.soon} />
              <StoreBadge store={t.hero.appStore} soon={t.hero.soon} />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter lang={lang} />
    </div>
  );
}
