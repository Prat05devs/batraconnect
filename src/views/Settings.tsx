'use client';
import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { DataState, PageHeader, formatDate } from '@/components/common';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import type { Category } from '@/lib/types';

type Audience = { citizens: boolean; officers: boolean };
type Features = { reports: Audience; ideas: Audience; appointments: Audience; updatedAt?: string | null };
type AppSettings = { maintenanceMessage: string; requireClosureEvidence: boolean; updatedAt?: string | null };
const MODULES: { key: keyof Omit<Features, 'updatedAt'>; title: string; description: string }[] = [
  {
    key: 'reports',
    title: 'Report a problem',
    description: 'Sending new reports. Existing reports can always be followed.',
  },
  { key: 'ideas', title: 'Ideas & suggestions', description: 'Sending new ideas to the office.' },
  { key: 'appointments', title: 'Jan Samvad booking', description: 'Requesting new appointments.' },
];
export function Settings() {
  const settings = useApi<{ features: Features; app: AppSettings }>('/admin/settings');
  return (
    <>
      <PageHeader
        title="App settings"
        description="Change how the app behaves without a new release. Every change is saved in the audit log."
      />
      <DataState loading={settings.loading} error={settings.error} />
      {settings.data && (
        <SettingsForm
          key={`${settings.data.features.updatedAt}|${settings.data.app.updatedAt}`}
          initial={settings.data}
          onSaved={settings.reload}
        />
      )}
    </>
  );
}
function SettingsForm({
  initial,
  onSaved,
}: {
  initial: { features: Features; app: AppSettings };
  onSaved: () => void;
}) {
  const [features, setFeatures] = useState(initial.features);
  const [app, setApp] = useState(initial.app);
  const [busy, setBusy] = useState('');
  async function save(name: 'features' | 'app', body: object) {
    setBusy(name);
    try {
      await api(`/admin/settings/${name}`, { method: 'PUT', body });
      toast.success('Saved. The app picks this up within a minute.');
      onSaved();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy('');
    }
  }
  async function restore(name: string) {
    try {
      await api(`/admin/settings/${name}/restore`, { method: 'POST' });
      toast.success('Previous version restored.');
      onSaved();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
          <CardDescription>
            Turn services on or off for citizens and for officers (field and nodal). The minister’s account
            never sends reports, ideas or bookings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead className="text-center">Citizens</TableHead>
                <TableHead className="text-center">Officers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MODULES.map(m => (
                <TableRow key={m.key}>
                  <TableCell>
                    <div className="font-medium">{m.title}</div>
                    <div className="text-xs text-muted-foreground">{m.description}</div>
                  </TableCell>
                  {(['citizens', 'officers'] as const).map(a => (
                    <TableCell key={a} className="text-center">
                      <Switch
                        checked={features[m.key][a]}
                        onCheckedChange={v =>
                          setFeatures({ ...features, [m.key]: { ...features[m.key], [a]: v } })
                        }
                        aria-label={`${m.title} for ${a}`}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex gap-2">
            <Button
              disabled={busy === 'features'}
              onClick={() => {
                const { updatedAt: _u, ...body } = features;
                void save('features', body);
              }}
            >
              Save features
            </Button>
            <Button variant="outline" onClick={() => void restore('features')}>
              <RotateCcw className="size-4" />
              Undo last change
            </Button>
            <span className="self-center text-xs text-muted-foreground">
              Last changed {formatDate(initial.features.updatedAt)}
            </span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>App behaviour</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <div className="font-medium">Maintenance banner</div>
            <p className="text-sm text-muted-foreground">
              Shown at the top of the app for everyone. Leave empty for no banner.
            </p>
            <Textarea
              maxLength={300}
              value={app.maintenanceMessage}
              onChange={e => setApp({ ...app, maintenanceMessage: e.target.value })}
              placeholder="e.g. Scheduled maintenance tonight 10–11 pm. Reports may take longer to send."
            />
          </div>
          <label className="flex items-start justify-between gap-6">
            <div>
              <div className="font-medium">Require a photo to mark a report resolved</div>
              <p className="text-sm text-muted-foreground">
                Field officers must attach a photo of the completed work.
              </p>
            </div>
            <Switch
              checked={app.requireClosureEvidence}
              onCheckedChange={v => setApp({ ...app, requireClosureEvidence: v })}
            />
          </label>
          <div className="flex gap-2">
            <Button
              disabled={busy === 'app'}
              onClick={() =>
                void save('app', {
                  maintenanceMessage: app.maintenanceMessage,
                  requireClosureEvidence: app.requireClosureEvidence,
                })
              }
            >
              Save
            </Button>
            <Button variant="outline" onClick={() => void restore('app')}>
              <RotateCcw className="size-4" />
              Undo last change
            </Button>
          </div>
        </CardContent>
      </Card>
      <Deadlines />
    </div>
  );
}
function Deadlines() {
  const list = useApi<{ categories: Category[] }>('/admin/categories');
  const [edits, setEdits] = useState<Record<string, string>>({});
  async function save(c: Category, patch: Partial<Category>) {
    try {
      await api(`/admin/categories/${encodeURIComponent(c.name)}`, { method: 'PATCH', body: patch });
      toast.success(`${c.name} updated.`);
      setEdits(e => {
        const { [c.name]: _x, ...rest } = e;
        return rest;
      });
      void list.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Report categories and deadlines</CardTitle>
        <CardDescription>
          A report past its deadline escalates automatically: first to the department, then administrators,
          then the minister’s office.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataState loading={list.loading && !list.data} error={list.error} />
        {list.data && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Applies to</TableHead>
                <TableHead>Deadline (hours)</TableHead>
                <TableHead className="text-center">In use</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.categories.map(c => (
                <TableRow key={c.name}>
                  <TableCell>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.hindiName}</div>
                  </TableCell>
                  <TableCell>{c.scope === 'roorkee' ? 'Roorkee municipal' : 'State'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        className="w-24"
                        inputMode="numeric"
                        value={edits[c.name] ?? String(c.slaHours)}
                        onChange={e =>
                          setEdits({ ...edits, [c.name]: e.target.value.replace(/\D/g, '').slice(0, 4) })
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        ≈ {Math.round((Number(edits[c.name] ?? c.slaHours) / 24) * 10) / 10} days
                      </span>
                      {edits[c.name] !== undefined && Number(edits[c.name]) !== c.slaHours && (
                        <Button
                          size="sm"
                          disabled={!Number(edits[c.name])}
                          onClick={() => void save(c, { slaHours: Number(edits[c.name]) })}
                        >
                          Save
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch checked={c.active} onCheckedChange={v => void save(c, { active: v })} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
