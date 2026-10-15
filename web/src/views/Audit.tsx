'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataState, PageHeader, Pick, formatDate, Field } from '@/components/common';
import { useApi } from '@/lib/use-api';
import { ROLE_LABEL } from '@/lib/types';

type Entry = {
  id: string;
  action: string;
  actor: { name: string; role: string } | null;
  targetType: string | null;
  targetId: string | null;
  details: unknown;
  ip: string | null;
  createdAt: string;
};
const GROUPS: [string, string][] = [
  ['all', 'Everything'],
  ['settings.', 'App settings'],
  ['integration.', 'Integrations'],
  ['admin.', 'Users & staff'],
  ['account.', 'Accounts'],
  ['auth.', 'Sign-in'],
  ['insights.', 'Exports'],
  ['content.', 'Content'],
  ['appointment.', 'Appointments'],
  ['idea.', 'Moderation'],
  ['delivery.', 'Messages'],
];
export function Audit() {
  const [group, setGroup] = useState('all');
  const [offset, setOffset] = useState(0);
  const list = useApi<{ entries: Entry[] }>(
    `/admin/audit?${new URLSearchParams({ limit: '50', offset: String(offset), ...(group !== 'all' ? { action: group } : {}) })}`,
  );
  return (
    <>
      <PageHeader
        title="Audit log"
        description="A permanent record of every administrative change, export and sign-in security event. It cannot be edited."
      />
      <Card className="mb-6 flex-row items-end gap-4 px-4 py-4">
        <Field label="Show">
          <Pick
            className="w-52"
            value={group}
            onChange={v => {
              setGroup(v);
              setOffset(0);
            }}
            options={GROUPS.map(([value, label]) => ({ value, label }))}
          />
        </Field>
      </Card>
      <DataState
        loading={list.loading && !list.data}
        error={list.error}
        empty={list.data?.entries.length === 0}
      />
      {!!list.data?.entries.length && (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>What</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.entries.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{formatDate(e.createdAt)}</TableCell>
                  <TableCell>
                    {e.actor ? (
                      <>
                        <div className="font-medium">{e.actor.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {ROLE_LABEL[e.actor.role] ?? e.actor.role}
                          {e.ip ? ` · ${e.ip}` : ''}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">System</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{e.action}</TableCell>
                  <TableCell
                    className="max-w-md truncate font-mono text-xs text-muted-foreground"
                    title={JSON.stringify(e.details)}
                  >
                    {JSON.stringify(e.details)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!offset}
          onClick={() => setOffset(Math.max(0, offset - 50))}
        >
          Newer
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={(list.data?.entries.length ?? 0) < 50}
          onClick={() => setOffset(offset + 50)}
        >
          Older
        </Button>
      </div>
    </>
  );
}
