'use client';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Download, Printer, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  DataState,
  PageHeader,
  Pick,
  StatusBadge,
  formatDate,
  formatDay,
  titleCase,
  Field,
} from '@/components/common';
import { BreakdownTable } from '@/views/Overview';
import { api, download, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { usePhoto } from '@/lib/use-photo';
import { DISTRICTS, STATUSES, type Category, type Complaint, type Insights } from '@/lib/types';

const PAGE = 50;
/** Filters live in the address bar, so a filtered view can be bookmarked or shared with another admin. */
function useFilters() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const setParams = (next: URLSearchParams) => router.replace(`${pathname}?${next}`);
  const get = (k: string) => params.get(k) ?? '';
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v && v !== 'all') next.set(k, v);
    else next.delete(k);
    next.delete('offset');
    setParams(next);
  };
  const query = useMemo(() => {
    const q = new URLSearchParams();
    for (const k of ['q', 'status', 'category', 'district', 'overdue', 'escalated', 'from', 'to'])
      if (params.get(k))
        q.set(
          k,
          k === 'from' || k === 'to'
            ? new Date(`${params.get(k)}T${k === 'from' ? '00:00:00' : '23:59:59'}+05:30`).toISOString()
            : (params.get(k) ?? ''),
        );
    return q;
  }, [params]);
  return {
    get,
    set,
    query,
    offset: Number(params.get('offset') ?? 0),
    setOffset: (n: number) => {
      const next = new URLSearchParams(params);
      next.set('offset', String(n));
      setParams(next);
    },
    raw: params,
  };
}
export function Reports() {
  const f = useFilters();
  const router = useRouter();
  const [text, setText] = useState(f.get('q'));
  const categories = useApi<{ categories: Category[] }>('/categories');
  const list = useApi<{ complaints: Complaint[]; total: number }>(
    `/complaints?${new URLSearchParams({ ...Object.fromEntries(f.query), sort: 'due', limit: String(PAGE), offset: String(f.offset) })}`,
  );
  const filterSelect = (key: string, label: string, options: string[]) => (
    <Field label={label}>
      <Pick
        className="w-44 bg-card"
        value={f.get(key) || 'all'}
        onChange={v => f.set(key, v)}
        options={[{ value: 'all', label: 'All' }, ...options.map(o => ({ value: o, label: o }))]}
      />
    </Field>
  );
  return (
    <>
      <PageHeader
        title="Reports"
        description="Every report in the app. Filter, open one to reassign it, or export."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                download(
                  `/insights/export.csv?${f.query}`,
                  `batra-connect-reports-${new Date().toISOString().slice(0, 10)}.csv`,
                ).catch(e => toast.error(errorMessage(e)))
              }
            >
              <Download className="size-4" />
              Export CSV
            </Button>
            <Button onClick={() => router.push(`/admin/print?${f.raw}`)}>
              <Printer className="size-4" />
              Printable summary (PDF)
            </Button>
          </>
        }
      />
      <Card className="mb-6 py-4">
        <CardContent className="flex flex-wrap items-end gap-4 px-4">
          <form
            onSubmit={e => {
              e.preventDefault();
              f.set('q', text.trim());
            }}
          >
            <Field label="Search">
              <div className="flex gap-2">
                <Input
                  className="w-64 bg-card"
                  placeholder="Title, reference, locality…"
                  value={text}
                  onChange={e => setText(e.target.value)}
                />
                <Button type="submit" variant="secondary" size="icon" aria-label="Search">
                  <Search className="size-4" />
                </Button>
              </div>
            </Field>
          </form>
          {filterSelect('status', 'Status', STATUSES)}
          {filterSelect('category', 'Category', categories.data?.categories.map(c => c.name) ?? [])}
          {filterSelect('district', 'District', DISTRICTS)}
          <Field label="From">
            <Input
              type="date"
              className="w-40 bg-card"
              value={f.get('from')}
              onChange={e => f.set('from', e.target.value)}
            />
          </Field>
          <Field label="To">
            <Input
              type="date"
              className="w-40 bg-card"
              value={f.get('to')}
              onChange={e => f.set('to', e.target.value)}
            />
          </Field>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <Switch
              checked={f.get('overdue') === 'true'}
              onCheckedChange={v => f.set('overdue', v ? 'true' : '')}
            />
            Past deadline
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <Switch
              checked={f.get('escalated') === 'true'}
              onCheckedChange={v => f.set('escalated', v ? 'true' : '')}
            />
            Escalated
          </label>
        </CardContent>
      </Card>
      <DataState
        loading={list.loading && !list.data}
        error={list.error}
        empty={list.data?.complaints.length === 0}
        emptyText="No reports match these filters."
      />
      {list.data && list.data.complaints.length > 0 && (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>District</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.complaints.map(c => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/reports/${c.id}`)}
                >
                  <TableCell className="font-mono text-xs">{c.reference}</TableCell>
                  <TableCell className="max-w-72 truncate font-medium">{c.title}</TableCell>
                  <TableCell>{c.category}</TableCell>
                  <TableCell>{titleCase(c.district)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <StatusBadge value={c.status} />
                      {c.overdue && <StatusBadge value="overdue" label="Late" />}
                    </div>
                  </TableCell>
                  <TableCell className={c.overdue ? 'text-red-700' : ''}>{formatDate(c.dueAt)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDay(c.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      {list.data && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {list.data.total
              ? `${f.offset + 1}–${Math.min(f.offset + PAGE, list.data.total)} of ${list.data.total}`
              : ''}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={f.offset === 0}
              onClick={() => f.setOffset(Math.max(0, f.offset - PAGE))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={f.offset + PAGE >= list.data.total}
              onClick={() => f.setOffset(f.offset + PAGE)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
type Staff = { id: string; name: string; openAssignments: number; overdueAssignments: number };
/** A resident's evidence photo or an officer's proof of the completed work; opens full size in a new tab. */
function ReportPhoto({ id, purpose }: { id: string; purpose?: string }) {
  const src = usePhoto(id);
  const label = purpose === 'resolution' ? 'Completed work' : 'Sent by the resident';
  return (
    <figure className="w-40">
      <a
        href={src ?? undefined}
        target="_blank"
        rel="noreferrer"
        className="relative block size-40 overflow-hidden rounded-lg border bg-muted"
      >
        {/* unoptimized: the photo is private and loaded through the signed-in blob URL. */}
        {src && <Image src={src} alt={label} fill unoptimized className="object-cover" />}
      </a>
      <figcaption className="mt-1 text-xs text-muted-foreground">{label}</figcaption>
    </figure>
  );
}

export function ReportDetail() {
  const { id } = useParams<{ id: string }>();
  const report = useApi<{ complaint: Complaint }>(`/complaints/${id}`);
  const staff = useApi<{ staff: Staff[] }>(`/staff?complaintId=${id}`);
  const [assignee, setAssignee] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const c = report.data?.complaint;
  const reassignable = c && ['Submitted', 'Assigned', 'Reopened', 'In progress'].includes(c.status);
  async function reassign() {
    if (!c) return;
    setBusy(true);
    try {
      const r = await api<{ complaint: Complaint }>(`/complaints/${c.id}/assign`, {
        method: 'POST',
        body: { assigneeId: assignee, version: c.version, note },
      });
      report.setData(r);
      setNote('');
      setAssignee('');
      toast.success('Report assigned.');
      void staff.reload();
    } catch (e) {
      toast.error(errorMessage(e));
      void report.reload();
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link href="/admin/reports" className="text-sm text-primary hover:underline">
        ← All reports
      </Link>
      <DataState loading={report.loading && !c} error={report.error} />
      {c && (
        <>
          <PageHeader
            title={c.title}
            description={`${c.reference} · received ${formatDate(c.createdAt)}`}
            actions={
              <>
                <StatusBadge value={c.status} />
                {c.overdue && (
                  <StatusBadge
                    value="overdue"
                    label={`Past deadline${c.escalationLevel ? ` · escalation ${c.escalationLevel}` : ''}`}
                  />
                )}
              </>
            }
          />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="grid gap-6 lg:col-span-2 content-start">
              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm">
                  <p>{c.description}</p>
                  <div className="grid grid-cols-2 gap-3 text-muted-foreground">
                    <span>
                      Category: <b className="text-foreground">{c.category}</b>
                    </span>
                    <span>
                      District: <b className="text-foreground">{titleCase(c.district)}</b>
                    </span>
                    <span>
                      Place:{' '}
                      <b className="text-foreground">
                        {c.locality}
                        {c.ward ? ` · ${c.ward.name}` : ''}
                      </b>
                    </span>
                    <span>
                      Deadline:{' '}
                      <b className={c.overdue ? 'text-red-700' : 'text-foreground'}>{formatDate(c.dueAt)}</b>
                    </span>
                    <span>
                      Field officer: <b className="text-foreground">{c.assignee?.name ?? 'Not assigned'}</b>
                    </span>
                    <span>
                      Office: <b className="text-foreground">{c.office?.name ?? '—'}</b>
                    </span>
                  </div>
                  {c.resolution && (
                    <p className="rounded-md bg-emerald-50 p-3 text-emerald-800">
                      Resolution: {c.resolution}
                    </p>
                  )}
                </CardContent>
              </Card>
              {!!c.media?.length && (
                <Card>
                  <CardHeader>
                    <CardTitle>Photos</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-3">
                    {c.media.map(m => (
                      <ReportPhoto key={m.id} id={m.id} purpose={m.purpose} />
                    ))}
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle>Activity</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {c.events?.map((e, n) => (
                    <div key={n} className="border-l-2 border-primary/30 pl-4 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge value={e.status} />
                        <span className="text-muted-foreground">
                          {e.actor} · {formatDate(e.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1">{e.note}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            <Card className="content-start">
              <CardHeader>
                <CardTitle>{c.assignee ? 'Reassign' : 'Assign'}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {!reassignable ? (
                  <p className="text-sm text-muted-foreground">
                    This report is {c.status.toLowerCase()} and can no longer be reassigned.
                  </p>
                ) : (
                  <>
                    <Field label="Field officer (least busy first)">
                      <Pick
                        className="w-full"
                        value={assignee}
                        onChange={setAssignee}
                        placeholder="Choose an officer"
                        options={(staff.data?.staff ?? []).map(s => ({
                          value: s.id,
                          label: `${s.name} — ${s.openAssignments} open, ${s.overdueAssignments} late`,
                          disabled: s.id === c.assignedTo,
                        }))}
                      />
                    </Field>
                    {staff.data && !staff.data.staff.length && (
                      <p className="text-sm text-red-700">
                        No active field officer covers this district and category. Add one in Users.
                      </p>
                    )}
                    <Field label="Note for the record">
                      <Textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="e.g. Officer on leave; reassigning to keep the deadline."
                      />
                    </Field>
                    <Button
                      disabled={busy || !assignee || note.trim().length < 5}
                      onClick={() => void reassign()}
                    >
                      {busy ? 'Saving…' : 'Assign report'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
/** A one-page summary designed for printing or "Save as PDF" from the browser. */
export function ReportPrint() {
  const f = useFilters();
  const insights = useApi<Insights>('/insights');
  const late = useApi<{ complaints: Complaint[]; total: number }>(
    `/complaints?${new URLSearchParams({ ...Object.fromEntries(f.query), overdue: 'true', sort: 'due', limit: '100' })}`,
  );
  const i = insights.data;
  const filters = [...f.raw.entries()]
    .filter(([k]) => k !== 'offset')
    .map(([k, v]) => `${titleCase(k)}: ${v}`)
    .join(' · ');
  return (
    <div className="mx-auto max-w-4xl bg-white p-8 print:p-0">
      <div className="mb-6 flex items-start justify-between print:hidden">
        <Link href={`/admin/reports?${f.raw}`} className="text-sm text-primary hover:underline">
          ← Back to reports
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="size-4" />
          Print / Save as PDF
        </Button>
      </div>
      <h1 className="text-2xl font-bold">Batra Connect — Reports summary</h1>
      <p className="text-sm text-muted-foreground">
        Prepared {formatDate(new Date().toISOString())}
        {filters ? ` · ${filters}` : ' · All reports'}
      </p>
      <DataState loading={insights.loading && !i} error={insights.error} />
      {i && (
        <>
          <div className="my-6 grid grid-cols-4 gap-4 text-center">
            {[
              ['All reports', i.totals.total],
              ['Open', i.totals.open],
              ['Past deadline', i.totals.overdue],
              ['Escalated', i.totals.escalated],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg border p-3">
                <div className="text-2xl font-bold">{v}</div>
                <div className="text-xs text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>
          <div className="grid gap-6">
            <BreakdownTable title="By department" rows={i.byCategory} />
            <BreakdownTable title="By district" rows={i.byDistrict} />
          </div>
        </>
      )}
      <h2 className="mt-8 mb-2 text-lg font-semibold">
        Reports past their deadline{late.data ? ` (${late.data.total})` : ''}
      </h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Deadline</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {late.data?.complaints.map(c => (
            <TableRow key={c.id}>
              <TableCell className="font-mono text-xs">{c.reference}</TableCell>
              <TableCell>{c.title}</TableCell>
              <TableCell>{c.category}</TableCell>
              <TableCell>{c.status}</TableCell>
              <TableCell>{formatDate(c.dueAt)}</TableCell>
            </TableRow>
          ))}
          {late.data && !late.data.complaints.length && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                None — every open report is within its deadline.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <p className="mt-8 text-xs text-muted-foreground">
        Figures cover all reports in Batra Connect. Department and district totals are not affected by the
        filters above; the late-reports list is.
      </p>
    </div>
  );
}
