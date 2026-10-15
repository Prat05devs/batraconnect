'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ImagePlus, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { DataState, PageHeader, Pick, StatusBadge, formatDate, Field } from '@/components/common';
import { api, errorMessage, photoUrl, uploadPhoto } from '@/lib/api';
import { useApi } from '@/lib/use-api';

type Bilingual = { en: string; hi?: string } | null;
type Entry = {
  id: string;
  type: string;
  slug: string;
  title: { en: string; hi?: string };
  summary: Bilingual;
  body: Bilingual;
  fields: Record<string, string | number | boolean | null>;
  mediaIds: string[];
  sourceUrl: string | null;
  sort: number;
  status: 'draft' | 'published' | 'archived';
  version: number;
  updatedAt: string;
};
const TYPES: { value: string; label: string; help: string }[] = [
  {
    value: 'announcement',
    label: 'Announcement',
    help: 'Shown on the citizen home screen under “Latest from the office”.',
  },
  { value: 'achievement', label: 'Achievement', help: 'Shown on the Achievements screen.' },
  {
    value: 'project',
    label: 'Development project',
    help: 'Shown on Development projects. Use facts for budget, status and milestones.',
  },
  {
    value: 'profile',
    label: 'Profile update',
    help: 'Use the short name “mla-roorkee” or “minister” to add updates to those profile pages.',
  },
  { value: 'photo', label: 'Photo', help: 'Shown under “New photos” in Achievements & photos.' },
];
const typeLabel = (t: string) => TYPES.find(x => x.value === t)?.label ?? t;

export function ContentList() {
  const router = useRouter();
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const list = useApi<{ entries: Entry[] }>(
    `/admin/content?${new URLSearchParams({ ...(type !== 'all' ? { type } : {}), ...(status !== 'all' ? { status } : {}) })}`,
  );
  return (
    <>
      <PageHeader
        title="Public content"
        description="Announcements, achievements, projects, profile updates and photos shown in the app. Published entries appear immediately, above the app's built-in content."
        actions={
          <Button onClick={() => router.push('/admin/content/new')}>
            <Plus className="size-4" />
            New entry
          </Button>
        }
      />
      <Card className="mb-6 flex-row flex-wrap items-end gap-4 px-4 py-4">
        <Field label="Type">
          <Pick
            className="w-52"
            value={type}
            onChange={setType}
            options={[
              { value: 'all', label: 'All types' },
              ...TYPES.map(t => ({ value: t.value, label: t.label })),
            ]}
          />
        </Field>
        <Field label="Status">
          <Pick
            className="w-40"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'All' },
              { value: 'draft', label: 'Draft' },
              { value: 'published', label: 'Published' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
        </Field>
      </Card>
      <DataState
        loading={list.loading && !list.data}
        error={list.error}
        empty={list.data?.entries.length === 0}
        emptyText="Nothing here yet. Create an entry to publish verified updates."
      />
      {!!list.data?.entries.length && (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last changed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.entries.map(e => (
                <TableRow
                  key={e.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/content/${e.id}`)}
                >
                  <TableCell>
                    <div className="font-medium">{e.title.en}</div>
                    <div className="text-xs text-muted-foreground">{e.slug}</div>
                  </TableCell>
                  <TableCell>{typeLabel(e.type)}</TableCell>
                  <TableCell>
                    <StatusBadge
                      value={e.status === 'published' ? 'sent' : e.status === 'draft' ? 'pending' : 'skipped'}
                      label={e.status}
                    />
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(e.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}

function Thumbnail({ id, onRemove }: { id: string; onRemove: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let url: string | null = null;
    let active = true;
    photoUrl(id)
      .then(u => {
        url = u;
        if (active) setSrc(u);
      })
      .catch(() => {});
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);
  // unoptimized: the photo is private and loaded through the signed-in blob URL, not a public address.
  return (
    <div className="relative size-32 overflow-hidden rounded-lg border bg-muted">
      {src && <Image src={src} alt="" fill unoptimized className="object-contain" />}
      <Button
        size="icon"
        variant="secondary"
        className="absolute top-1 right-1 size-7"
        aria-label="Remove photo"
        onClick={onRemove}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

/** Create (id = "new") or edit one entry. */
export function ContentEditor({ id }: { id: string }) {
  const creating = id === 'new';
  const existing = useApi<{ entries: Entry[] }>(creating ? null : '/admin/content');
  const entry = existing.data?.entries.find(e => e.id === id);
  if (creating) return <EntryForm entry={null} onSaved={() => {}} />;
  if (!entry)
    return (
      <DataState
        loading={existing.loading}
        error={existing.error ?? (existing.data ? new Error('Entry not found.') : null)}
      />
    );
  // Keyed by version: after a save the form starts again from the stored entry.
  return <EntryForm key={entry.version} entry={entry} onSaved={existing.reload} />;
}
const formFrom = (entry: Entry | null) => ({
  type: entry?.type ?? 'announcement',
  slug: entry?.slug ?? '',
  titleEn: entry?.title.en ?? '',
  titleHi: entry?.title.hi ?? '',
  summaryEn: entry?.summary?.en ?? '',
  summaryHi: entry?.summary?.hi ?? '',
  bodyEn: entry?.body?.en ?? '',
  bodyHi: entry?.body?.hi ?? '',
  facts: Object.entries(entry?.fields ?? {})
    .map(([k, v]) => `${k}: ${v ?? ''}`)
    .join('\n'),
  sourceUrl: entry?.sourceUrl ?? '',
  sort: String(entry?.sort ?? 0),
  mediaIds: entry?.mediaIds ?? [],
});
function EntryForm({ entry, onSaved }: { entry: Entry | null; onSaved: () => void }) {
  const router = useRouter();
  const creating = !entry;
  const fileInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(() => formFrom(entry));
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));
  const pair = (en: string, hi: string) =>
    en.trim() ? { en: en.trim(), ...(hi.trim() ? { hi: hi.trim() } : {}) } : undefined;
  const facts = () =>
    Object.fromEntries(
      form.facts
        .split('\n')
        .map(l => l.match(/^\s*([^:]{1,60}?)\s*:\s*(.*)$/))
        .filter((m): m is RegExpMatchArray => !!m)
        .map(m => [m[1].trim(), /^-?\d+(\.\d+)?$/.test(m[2].trim()) ? Number(m[2].trim()) : m[2].trim()]),
    );
  const validSlug = /^[a-z0-9][a-z0-9-]{1,79}$/.test(form.slug);
  async function save(status: 'draft' | 'published' | 'archived') {
    setBusy(true);
    try {
      const body = {
        type: form.type,
        slug: form.slug,
        title: pair(form.titleEn, form.titleHi),
        summary: pair(form.summaryEn, form.summaryHi),
        body: pair(form.bodyEn, form.bodyHi),
        fields: facts(),
        mediaIds: form.mediaIds,
        ...(form.sourceUrl.trim() ? { sourceUrl: form.sourceUrl.trim() } : {}),
        sort: Number(form.sort) || 0,
        status,
      };
      if (creating) {
        const r = await api<{ entry: Entry }>('/admin/content', { method: 'POST', body });
        toast.success(status === 'published' ? 'Published.' : 'Saved as draft.');
        router.replace(`/admin/content/${r.entry.id}`);
      } else {
        await api(`/admin/content/${entry.id}`, { method: 'PUT', body: { ...body, version: entry.version } });
        toast.success(
          status === 'published'
            ? 'Published.'
            : status === 'archived'
              ? 'Archived — removed from the app.'
              : 'Saved as draft.',
        );
        onSaved();
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const ids: string[] = [];
      for (const file of Array.from(files).slice(0, 20 - form.mediaIds.length))
        ids.push(await uploadPhoto(file, 'gallery'));
      set({ mediaIds: [...form.mediaIds, ...ids] });
      toast.success(`${ids.length} photo${ids.length === 1 ? '' : 's'} added. Save to keep them.`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }
  const textPair = (label: string, en: keyof typeof form, hi: keyof typeof form, rows: number) => (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label={`${label} (English)`}>
        <Textarea rows={rows} value={form[en] as string} onChange={e => set({ [en]: e.target.value })} />
      </Field>
      <Field label={`${label} (Hindi)`}>
        <Textarea rows={rows} value={form[hi] as string} onChange={e => set({ [hi]: e.target.value })} />
      </Field>
    </div>
  );
  return (
    <>
      <Link href="/admin/content" className="text-sm text-primary hover:underline">
        ← All content
      </Link>
      <PageHeader
        title={creating ? 'New content entry' : form.titleEn || 'Content entry'}
        description={
          creating ? undefined : `Status: ${entry?.status} · last changed ${formatDate(entry?.updatedAt)}`
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Text</CardTitle>
            <CardDescription>
              English is required; add Hindi so the app shows it to Hindi readers.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Title (English)">
                <Input value={form.titleEn} onChange={e => set({ titleEn: e.target.value })} />
              </Field>
              <Field label="Title (Hindi)">
                <Input value={form.titleHi} onChange={e => set({ titleHi: e.target.value })} />
              </Field>
            </div>
            {textPair('Summary', 'summaryEn', 'summaryHi', 3)}
            {textPair('Full text (optional)', 'bodyEn', 'bodyHi', 5)}
            <Field label="Facts — one “name: value” per line">
              <Textarea
                rows={4}
                value={form.facts}
                onChange={e => set({ facts: e.target.value })}
                placeholder={
                  'Budget (₹ crore): 12.5\nStatus: Tender issued\nMilestone: Work starts December 2026'
                }
              />
            </Field>
          </CardContent>
        </Card>
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Field label="Type">
                <Pick
                  className="w-full"
                  value={form.type}
                  onChange={type => set({ type })}
                  options={TYPES.map(t => ({ value: t.value, label: t.label }))}
                />
                <p className="text-xs text-muted-foreground">
                  {TYPES.find(t => t.value === form.type)?.help}
                </p>
              </Field>
              <Field label="Short name (lowercase, numbers, hyphens)">
                <Input
                  value={form.slug}
                  onChange={e => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  placeholder="roorkee-drainage-upgrade"
                />
              </Field>
              <Field label="Official source link (optional, https://)">
                <Input value={form.sourceUrl} onChange={e => set({ sourceUrl: e.target.value })} />
              </Field>
              <Field label="Display order (lower shows first)">
                <Input
                  inputMode="numeric"
                  value={form.sort}
                  onChange={e => set({ sort: e.target.value.replace(/[^\d-]/g, '').slice(0, 6) })}
                />
              </Field>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Photos</CardTitle>
              <CardDescription>
                Only photos the office may publish, with consent from identifiable people. Location data is
                removed automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                {form.mediaIds.map(m => (
                  <Thumbnail
                    key={m}
                    id={m}
                    onRemove={() => set({ mediaIds: form.mediaIds.filter(x => x !== m) })}
                  />
                ))}
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                hidden
                onChange={e => void addPhotos(e.target.files)}
              />
              <Button
                variant="outline"
                disabled={busy || form.mediaIds.length >= 20}
                onClick={() => fileInput.current?.click()}
              >
                <ImagePlus className="size-4" />
                Add photos
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="grid gap-2 pt-6">
              <Button
                disabled={busy || !validSlug || !form.titleEn.trim()}
                onClick={() => void save('published')}
              >
                Publish
              </Button>
              <Button
                variant="outline"
                disabled={busy || !validSlug || !form.titleEn.trim()}
                onClick={() => void save('draft')}
              >
                Save as draft
              </Button>
              {!creating && entry?.status !== 'archived' && (
                <Button
                  variant="outline"
                  className="text-destructive"
                  disabled={busy}
                  onClick={() => void save('archived')}
                >
                  Archive (remove from the app)
                </Button>
              )}
              {!validSlug && form.slug && (
                <p className="text-xs text-red-700">
                  The short name needs 2–80 lowercase letters, numbers or hyphens.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
