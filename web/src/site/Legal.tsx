import { SiteFooter, SiteHeader } from './chrome';

/** Shared frame for the privacy policy and terms: readable column, clear headings. */
export function Legal({
  title,
  updated,
  children,
}: React.PropsWithChildren<{ title: string; updated: string }>) {
  return (
    <div className="bg-white text-[#0c2148]">
      <SiteHeader lang="en" />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-[#53627a]">Last updated {updated}</p>
        <div className="mt-10 space-y-4 leading-relaxed text-[#2a3a55] [&_a]:font-medium [&_a]:text-[#075bd8] [&_a]:underline-offset-4 hover:[&_a]:underline [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[#0c2148] [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
          {children}
        </div>
      </main>
      <SiteFooter lang="en" />
    </div>
  );
}
