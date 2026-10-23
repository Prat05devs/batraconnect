'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  BellRing,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  HandHeart,
  MapPin,
  Megaphone,
  Route,
} from 'lucide-react';
import { copy, useCaseIds, type Lang, type UseCaseId } from './content';

const icons: Record<UseCaseId, typeof Camera> = {
  report: Camera,
  track: ClipboardList,
  meet: CalendarDays,
  scheme: HandHeart,
  service: Route,
  updates: Megaphone,
};
/** How long each use case stays on the phone before the next one, unless the visitor picks one. */
const ROTATE_MS = 5000;

export function StoreBadge({ store, soon }: { store: string; soon: string }) {
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

const card = 'rounded-2xl bg-white p-3.5 shadow-sm';
const muted = 'text-[#53627a]';

/** Illustrated app screens (not screenshots), one per use case. */
function Screen({ id, lang }: { id: UseCaseId; lang: Lang }) {
  const u = copy[lang].useCases;
  switch (id) {
    case 'report': {
      const t = u.report.screen;
      return (
        <>
          <div className={card}>
            <span className="inline-block rounded-full bg-[#eaf2ff] px-2.5 py-1 text-[11px] font-medium text-[#075bd8]">
              {t.category}
            </span>
            <p className="mt-2.5 text-xs leading-snug text-[#0c2148]">{t.detail}</p>
            <p className={`mt-2 flex items-center gap-1 text-xs ${muted}`}>
              <MapPin className="size-3" />
              {t.place}
            </p>
          </div>
          <div className={`${card} mt-3`}>
            <p className={`text-[11px] ${muted}`}>{t.photos}</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="relative aspect-square overflow-hidden rounded-lg">
                <Image src="/photos/259.jpg" alt="" fill sizes="64px" className="object-cover" />
              </div>
              <div className="aspect-square rounded-lg border-2 border-dashed border-[#c9d2df]" />
              <div className="aspect-square rounded-lg border-2 border-dashed border-[#c9d2df]" />
            </div>
          </div>
          <div className="mt-3 rounded-2xl bg-[#075bd8] p-3 text-center text-xs font-semibold text-white">
            {t.button}
          </div>
        </>
      );
    }
    case 'track': {
      const t = u.track.screen;
      return (
        <>
          <div className={card}>
            <p className={`font-mono text-[10px] ${muted}`}>{t.ref}</p>
            <p className="mt-1 text-sm font-semibold text-[#0c2148]">{t.issue}</p>
            <p className={`mt-1 flex items-center gap-1 text-xs ${muted}`}>
              <MapPin className="size-3" />
              {t.place}
            </p>
            <span className="mt-3 inline-block rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800">
              {t.due}
            </span>
          </div>
          <ol className={`${card} mt-3 space-y-2.5`}>
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
                  <span className={done ? 'font-medium text-[#0c2148]' : muted}>{step}</span>
                </li>
              );
            })}
          </ol>
        </>
      );
    }
    case 'meet': {
      const t = u.meet.screen;
      return (
        <>
          <p className={`px-1 text-xs ${muted}`}>{t.intro}</p>
          <ul className="mt-2 space-y-2">
            {t.slots.map((slot, i) => (
              <li
                key={slot}
                className={`flex items-center justify-between rounded-2xl p-3 text-xs font-medium shadow-sm ${
                  i === 0 ? 'bg-[#075bd8] text-white' : 'bg-white text-[#0c2148]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <CalendarDays className="size-4" />
                  {slot}
                </span>
                {i === 0 && <Check className="size-4" strokeWidth={3} />}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-start gap-2 rounded-2xl bg-emerald-50 p-3 text-[11px] leading-snug text-emerald-900">
            <BellRing className="size-4 shrink-0" />
            {t.picked}
          </div>
        </>
      );
    }
    case 'scheme': {
      const t = u.scheme.screen;
      return (
        <>
          <div className={card}>
            <p className="text-sm font-semibold text-[#0c2148]">{t.name}</p>
            <ul className="mt-2 divide-y divide-[#eef1f6]">
              {t.rows.map(row => (
                <li key={row} className="flex items-center justify-between py-2 text-xs text-[#0c2148]">
                  {row}
                  <ChevronRight className="size-3.5 text-[#53627a]" />
                </li>
              ))}
            </ul>
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#075bd8]">
              {t.link}
              <ExternalLink className="size-3" />
            </p>
          </div>
          <p className={`mt-3 px-1 text-[11px] leading-snug ${muted}`}>{t.more}</p>
        </>
      );
    }
    case 'service': {
      const t = u.service.screen;
      return (
        <>
          <div className={card}>
            <p className="text-sm font-semibold text-[#0c2148]">{t.name}</p>
            <ol className="mt-3 space-y-2.5">
              {t.steps.map((step, i) => (
                <li key={step} className="flex items-center gap-2.5 text-xs text-[#0c2148]">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#eaf2ff] text-[11px] font-bold text-[#075bd8]">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <p className={`mt-3 px-1 text-[11px] leading-snug ${muted}`}>{t.more}</p>
        </>
      );
    }
    case 'updates': {
      const t = u.updates.screen;
      return (
        <ul className="space-y-2">
          {t.items.map(([title, body], i) => (
            <li key={title} className={`${card} flex gap-2.5`}>
              <span
                className={`mt-0.5 size-2 shrink-0 rounded-full ${i === 0 ? 'bg-emerald-500' : 'bg-[#075bd8]'}`}
              />
              <span>
                <span className="block text-xs font-semibold text-[#0c2148]">{title}</span>
                <span className={`mt-0.5 block text-[11px] leading-snug ${muted}`}>{body}</span>
              </span>
            </li>
          ))}
        </ul>
      );
    }
  }
}

function Phone({ active, lang }: { active: UseCaseId; lang: Lang }) {
  const nav =
    lang === 'hi' ? ['होम', 'शिकायतें', 'सेवाएँ', 'प्रोफ़ाइल'] : ['Home', 'Reports', 'Services', 'Profile'];
  return (
    <div
      aria-hidden="true"
      className="relative z-10 flex aspect-[9/16] w-[190px] shrink-0 flex-col overflow-hidden rounded-[2.6rem] border-[10px] border-[#06142f] bg-[#f5f7fb] shadow-2xl shadow-black/40 sm:w-[300px]"
    >
      {/* Status bar and camera notch */}
      <div className="relative flex items-center justify-between px-5 pt-3 text-[11px] font-semibold text-[#0c2148]">
        <span>9:41</span>
        <span className="absolute left-1/2 top-2.5 h-5 w-20 -translate-x-1/2 rounded-full bg-[#06142f]" />
        <span className="flex items-center gap-1">
          <span className="h-2 w-3 rounded-[2px] bg-[#0c2148]/80" />
          <span className="h-2 w-4 rounded-[3px] border border-[#0c2148]/80" />
        </span>
      </div>
      <div className="flex flex-1 flex-col px-4 pt-5">
        <p className="text-sm font-semibold text-[#0c2148]">{copy[lang].useCases[active].screen.title}</p>
        {/* Keyed so each screen fades in fresh. */}
        <div key={active} className="mt-3 flex-1 animate-in fade-in duration-300 motion-reduce:animate-none">
          <Screen id={active} lang={lang} />
        </div>
      </div>
      {/* App tab bar */}
      <div className="grid grid-cols-4 border-t border-[#d9e0eb] bg-white px-2 pt-2 pb-3 text-center text-[10px] font-medium text-[#53627a]">
        {nav.map((label, i) => (
          <span key={label} className={i === 0 ? 'text-[#075bd8]' : ''}>
            <span
              className={`mx-auto mb-1 block size-1.5 rounded-full ${i === 0 ? 'bg-[#075bd8]' : 'bg-transparent'}`}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function HeroShowcase({ lang }: { lang: Lang }) {
  const t = copy[lang].hero;
  const u = copy[lang].useCases;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setStill(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const rotating = !paused && !still;
  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(() => setIndex(i => (i + 1) % useCaseIds.length), ROTATE_MS);
    return () => window.clearTimeout(timer);
  }, [index, rotating]);
  const active = useCaseIds[index];

  return (
    <section className="relative overflow-hidden bg-[#0c2148] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(7,91,216,0.6),transparent_55%)]" />
      <div className="relative mx-auto max-w-6xl px-4 pt-8 pb-10 sm:px-6 lg:pt-10">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#8fb8ff]">{t.eyebrow}</p>
            <h1 className="mt-3 text-4xl leading-tight font-bold tracking-tight text-balance sm:text-5xl lg:text-[3.4rem]">
              {t.title}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/80">{t.body}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <StoreBadge store={t.play} soon={t.soon} />
              <StoreBadge store={t.appStore} soon={t.soon} />
            </div>
            <p className="mt-4 text-sm text-white/60">{t.note}</p>
          </div>

          {/* Portrait of Shri Batra behind the phone that walks through the use cases. */}
          <div className="relative mx-auto flex h-[400px] w-full max-w-xl items-end justify-start sm:h-[560px]">
            <figure className="absolute top-0 right-0 h-[320px] w-[62%] overflow-hidden rounded-3xl bg-[#13305f] shadow-2xl ring-1 ring-white/10 sm:h-[470px]">
              <Image
                src="/brand/pradeep-batra.jpg"
                alt={t.name}
                fill
                priority
                sizes="(min-width: 1024px) 320px, 70vw"
                className="object-cover object-top"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#06142f] via-[#06142f]/80 to-transparent px-4 pt-14 pb-4 pl-[38%] text-right">
                <span className="block text-sm font-semibold">{t.name}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-white/75">{t.role}</span>
              </figcaption>
            </figure>
            <Phone active={active} lang={lang} />
          </div>
        </div>

        {/* The use cases: each one shows its screen on the phone above. */}
        <div
          role="group"
          aria-label={t.tabsLabel}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          className="mt-12 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6"
        >
          {useCaseIds.map((id, i) => {
            const Icon = icons[id];
            const on = i === index;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => setIndex(i)}
                className={`relative overflow-hidden rounded-2xl p-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8fb8ff] ${
                  on
                    ? 'bg-white text-[#0c2148]'
                    : 'bg-white/[0.06] text-white ring-1 ring-white/10 hover:bg-white/10'
                }`}
              >
                <Icon className={`size-5 ${on ? 'text-[#075bd8]' : 'text-[#8fb8ff]'}`} />
                <span className="mt-2.5 block text-sm font-semibold">{u[id].tab}</span>
                <span
                  className={`mt-0.5 block text-xs leading-snug ${on ? 'text-[#53627a]' : 'text-white/60'}`}
                >
                  {u[id].line}
                </span>
                {on && rotating && (
                  <span
                    key={index}
                    className="absolute inset-x-0 bottom-0 h-1 origin-left bg-[#075bd8]"
                    style={{ animation: `hero-progress ${ROTATE_MS}ms linear forwards` }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
