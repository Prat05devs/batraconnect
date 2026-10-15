'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataState, PageHeader, Pick, StatusBadge, formatDate, Field } from '@/components/common';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';

type Delivery = {
  id: string;
  channel: string;
  destination: string;
  subject: string | null;
  body: string | null;
  isCode: boolean;
  status: string;
  attempts: number;
  error: string | null;
  createdAt: string;
};
export function Messages() {
  const [status, setStatus] = useState('all');
  const [channel, setChannel] = useState('all');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const list = useApi<{ deliveries: Delivery[] }>(
    `/admin/deliveries?${new URLSearchParams({ ...(status !== 'all' ? { status } : {}), ...(channel !== 'all' ? { channel } : {}), ...(search ? { q: search } : {}) })}`,
  );
  return (
    <>
      <PageHeader
        title="Message log"
        description="Every email, SMS and push the app sends. Use it when someone says “I didn't get it”."
      />
      <Card className="mb-6 flex-row flex-wrap items-end gap-4 px-4 py-4">
        <form
          onSubmit={e => {
            e.preventDefault();
            setSearch(q.trim());
          }}
        >
          <Field label="Email or mobile">
            <Input
              className="w-64"
              placeholder="Search recipient"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </Field>
        </form>
        <Field label="Status">
          <Pick
            className="w-48"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'All' },
              { value: 'failed', label: 'Failed' },
              { value: 'skipped', label: 'Not sent (no provider)' },
              { value: 'pending', label: 'Waiting' },
              { value: 'sent', label: 'Sent' },
            ]}
          />
        </Field>
        <Field label="Channel">
          <Pick
            className="w-36"
            value={channel}
            onChange={setChannel}
            options={[
              { value: 'all', label: 'All' },
              { value: 'email', label: 'Email' },
              { value: 'sms', label: 'SMS' },
              { value: 'push', label: 'Push' },
            ]}
          />
        </Field>
      </Card>
      <DataState
        loading={list.loading && !list.data}
        error={list.error}
        empty={list.data?.deliveries.length === 0}
        emptyText="No messages match."
      />
      {!!list.data?.deliveries.length && (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.deliveries.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="text-xs">{formatDate(d.createdAt)}</TableCell>
                  <TableCell>
                    <div className="text-xs uppercase text-muted-foreground">{d.channel}</div>
                    <div className="max-w-56 truncate">{d.destination}</div>
                  </TableCell>
                  <TableCell className="max-w-80 text-sm whitespace-normal">
                    {d.isCode ? (
                      <span className="text-muted-foreground">Sign-in / verification code (hidden)</span>
                    ) : (
                      <span className="line-clamp-2">{d.body ?? d.subject}</span>
                    )}
                    {d.error && <div className="text-xs text-red-700">{d.error}</div>}
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={d.status} label={d.status === 'skipped' ? 'Not sent' : d.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {['failed', 'skipped'].includes(d.status) &&
                      (d.isCode ? (
                        <span className="text-xs text-muted-foreground">Ask them to request a new code</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            api(`/admin/deliveries/${d.id}/resend`, { method: 'POST' })
                              .then(() => {
                                toast.success('Queued to send again.');
                                void list.reload();
                              })
                              .catch(e => toast.error(errorMessage(e)))
                          }
                        >
                          Resend
                        </Button>
                      ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
