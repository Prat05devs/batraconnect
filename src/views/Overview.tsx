'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataState, PageHeader, Stat, StatusBadge, formatDate, titleCase } from '@/components/common';
import { useApi } from '@/lib/use-api';
import type { Breakdown, Insights } from '@/lib/types';

type Health = {
  providers: Record<string, string>;
  devLogging: boolean;
  yourAddress: string;
  proxyMisconfigured: boolean;
  jobs: { name: string; lastFinishedAt: string | null; lastError: string | null }[];
  failedLast7d: number;
  counts: { citizens: number; staff: number; reports: number };
};
const providerLabel: Record<string, string> = {
  dashboard: 'Set in dashboard',
  server: 'Set on server',
  none: 'Not set up',
};

export function Overview() {
  const insights = useApi<Insights>('/insights');
  const health = useApi<Health>('/admin/health');
  const i = insights.data,
    h = health.data;
  const max = Math.max(1, ...(i?.trend ?? []).flatMap(w => [w.created, w.resolved]));
  return (
    <>
      <PageHeader
        title="Overview"
        description="Live figures across the whole app, and whether everything is working."
      />
      <DataState loading={insights.loading && !i} error={insights.error} />
      {i && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="All reports" value={i.totals.total} />
          <Stat label="Open" value={i.totals.open} />
          <Stat label="Past deadline" value={i.totals.overdue} tone={i.totals.overdue ? 'danger' : 'good'} />
          <Stat label="Escalated" value={i.totals.escalated} tone={i.totals.escalated ? 'danger' : 'good'} />
        </div>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Last 12 weeks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-end gap-2">
              {i?.trend.map(w => (
                <div
                  key={w.week}
                  className="flex h-full flex-1 items-end gap-0.5"
                  title={`Week of ${w.week}: ${w.created} received, ${w.resolved} resolved`}
                >
                  <div
                    className="flex-1 rounded-t bg-primary"
                    style={{ height: `${Math.max(2, (w.created / max) * 100)}%` }}
                  />
                  <div
                    className="flex-1 rounded-t bg-emerald-600"
                    style={{ height: `${Math.max(2, (w.resolved / max) * 100)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <span>
                <span className="mr-1 inline-block size-2 rounded-sm bg-primary" />
                Received {i?.trend.reduce((a, w) => a + w.created, 0)}
              </span>
              <span>
                <span className="mr-1 inline-block size-2 rounded-sm bg-emerald-600" />
                Resolved {i?.trend.reduce((a, w) => a + w.resolved, 0)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>System health</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <DataState loading={health.loading && !h} error={health.error} />
            {h && (
              <>
                <div className="flex justify-between">
                  <span>Database</span>
                  <StatusBadge value="sent" label="Working" />
                </div>
                {(['email', 'sms', 'push'] as const).map(n => {
                  const state = n === 'push' && h.providers[n] === 'none' ? 'server' : h.providers[n];
                  return (
                    <div key={n} className="flex justify-between">
                      <span>{n === 'sms' ? 'SMS' : titleCase(n)}</span>
                      <StatusBadge
                        value={state}
                        label={
                          n === 'push' && h.providers[n] === 'none'
                            ? 'Working (no key needed)'
                            : providerLabel[h.providers[n]]
                        }
                      />
                    </div>
                  );
                })}
                <div className="flex justify-between">
                  <span>Messages failed (7 days)</span>
                  <StatusBadge value={h.failedLast7d ? 'failed' : 'sent'} label={String(h.failedLast7d)} />
                </div>
                {h.devLogging && (
                  <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">
                    Development mode: messages without a provider are written to the server log instead of
                    being sent.
                  </p>
                )}
                {h.proxyMisconfigured && (
                  <p className="rounded-md bg-red-50 p-2 text-xs text-red-700">
                    The server sees every visitor as {h.yourAddress}, so all visitors share one rate limit.
                    Increase TRUST_PROXY_HOPS on the server by one and restart it.
                  </p>
                )}
                <div className="border-t pt-3 text-xs text-muted-foreground">
                  <div className="flex justify-between gap-2">
                    <span>Your address, as the server sees it</span>
                    <span className="font-mono">{h.yourAddress}</span>
                  </div>
                  {h.jobs.map(j => (
                    <div key={j.name} className="flex justify-between gap-2">
                      <span>{titleCase(j.name)} job</span>
                      <span className={j.lastError ? 'text-red-700' : ''}>
                        {j.lastError ? 'Failing' : formatDate(j.lastFinishedAt)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3 text-xs text-muted-foreground">
                  {h.counts.citizens} citizens · {h.counts.staff} staff · {h.counts.reports} reports
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      {i && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <BreakdownTable title="By department" rows={i.byCategory} />
          <BreakdownTable title="By district" rows={i.byDistrict} />
        </div>
      )}
    </>
  );
}
export function BreakdownTable({ title, rows }: { title: string; rows: Breakdown[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Open</TableHead>
              <TableHead className="text-right">Past deadline</TableHead>
              <TableHead className="text-right">Avg hrs</TableHead>
              <TableHead className="text-right">On time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.key}>
                <TableCell className="font-medium">{titleCase(r.key)}</TableCell>
                <TableCell className="text-right">{r.total}</TableCell>
                <TableCell className="text-right">{r.open}</TableCell>
                <TableCell className={`text-right ${r.overdue ? 'text-red-700' : ''}`}>{r.overdue}</TableCell>
                <TableCell className="text-right">{r.avgResolutionHours ?? '–'}</TableCell>
                <TableCell className="text-right">
                  {r.withinSlaPercent === null ? '–' : `${r.withinSlaPercent}%`}
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No reports yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
