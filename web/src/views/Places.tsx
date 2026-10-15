'use client';
import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { DataState, PageHeader, Pick, StatusBadge, titleCase, Field } from '@/components/common';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { DISTRICTS, type Category } from '@/lib/types';

type Ward = {
  id: string;
  number: number;
  name: string;
  hindiName: string | null;
  localities: string[];
  verified: boolean;
  active: boolean;
};
type Office = {
  id: string;
  name: string;
  hindiName: string | null;
  district: string;
  category: string | null;
  wardId: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  hours: string | null;
  active: boolean;
};

export function Places() {
  return (
    <>
      <PageHeader
        title="Wards & offices"
        description="Roorkee wards citizens choose when reporting, and the offices shown as responsible on each report."
      />
      <div className="grid gap-6">
        <Wards />
        <Offices />
      </div>
    </>
  );
}
function Wards() {
  const list = useApi<{ wards: Ward[] }>('/wards?town=Roorkee');
  const [editing, setEditing] = useState<Ward | null>(null);
  const unverified = list.data?.wards.filter(w => !w.verified).length ?? 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Roorkee wards</CardTitle>
        <CardDescription>
          {unverified
            ? `${unverified} wards are not verified yet. Confirm each ward's name and localities with the municipal corporation, then mark it verified.`
            : 'All wards are verified.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataState loading={list.loading && !list.data} error={list.error} />
        {list.data && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Localities</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.wards.map(w => (
                <TableRow key={w.id}>
                  <TableCell>{w.number}</TableCell>
                  <TableCell>
                    <div className="font-medium">{w.name}</div>
                    <div className="text-xs text-muted-foreground">{w.hindiName}</div>
                  </TableCell>
                  <TableCell
                    className="max-w-72 truncate text-sm text-muted-foreground"
                    title={w.localities.join(', ')}
                  >
                    {w.localities.join(', ') || '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      value={w.verified ? 'sent' : 'pending'}
                      label={w.verified ? 'Verified' : 'Not verified'}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setEditing(w)}>
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {editing && (
          <WardDialog
            ward={editing}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              void list.reload();
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
function WardDialog({ ward, onClose, onSaved }: { ward: Ward; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: ward.name,
    hindiName: ward.hindiName ?? '',
    localities: ward.localities.join('\n'),
    verified: ward.verified,
  });
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ward {ward.number}</DialogTitle>
          <DialogDescription>Citizens see this name when choosing their ward.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Name">
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Hindi name">
            <Input value={form.hindiName} onChange={e => setForm({ ...form, hindiName: e.target.value })} />
          </Field>
          <Field label="Localities (one per line)">
            <Textarea
              rows={5}
              value={form.localities}
              onChange={e => setForm({ ...form, localities: e.target.value })}
            />
          </Field>
          <label className="flex items-center justify-between gap-4 text-sm">
            <span>Verified with the municipal corporation</span>
            <Switch checked={form.verified} onCheckedChange={verified => setForm({ ...form, verified })} />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={busy || form.name.trim().length < 2}
            onClick={() => {
              setBusy(true);
              api(`/admin/wards/${ward.id}`, {
                method: 'PATCH',
                body: {
                  name: form.name.trim(),
                  hindiName: form.hindiName.trim() || null,
                  localities: form.localities
                    .split('\n')
                    .map(x => x.trim())
                    .filter(x => x.length >= 2),
                  verified: form.verified,
                },
              })
                .then(() => {
                  toast.success('Ward saved.');
                  onSaved();
                })
                .catch(e => toast.error(errorMessage(e)))
                .finally(() => setBusy(false));
            }}
          >
            {busy ? 'Saving…' : 'Save ward'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function Offices() {
  const list = useApi<{ offices: Office[] }>('/offices');
  const [editing, setEditing] = useState<Office | 'new' | null>(null);
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Responsible offices</CardTitle>
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus className="size-4" />
            Add office
          </Button>
        </div>
        <CardDescription>
          Each report shows the most specific match: ward + category, then ward, then district + category,
          then district.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataState
          loading={list.loading && !list.data}
          error={list.error}
          empty={list.data?.offices.length === 0}
          emptyText="No offices yet. Add the offices that handle reports so citizens know who is responsible."
        />
        {!!list.data?.offices.length && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Office</TableHead>
                <TableHead>Covers</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.offices.map(o => (
                <TableRow key={o.id}>
                  <TableCell>
                    <div className="font-medium">{o.name}</div>
                    <div className="text-xs text-muted-foreground">{o.hours}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {titleCase(o.district)}
                    {o.category ? ` · ${o.category}` : ' · all categories'}
                    {o.wardId ? ` · ${o.wardId.replace('roorkee-', 'Ward ')}` : ''}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[o.phone, o.email].filter(Boolean).join(' · ') || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setEditing(o)}>
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {editing && (
          <OfficeDialog
            office={editing === 'new' ? null : editing}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              void list.reload();
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
function OfficeDialog({
  office,
  onClose,
  onSaved,
}: {
  office: Office | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const categories = useApi<{ categories: Category[] }>('/categories');
  const wards = useApi<{ wards: Ward[] }>('/wards?town=Roorkee');
  const [form, setForm] = useState({
    name: office?.name ?? '',
    hindiName: office?.hindiName ?? '',
    district: office?.district ?? 'haridwar',
    category: office?.category ?? '',
    wardId: office?.wardId ?? '',
    phone: office?.phone ?? '',
    email: office?.email ?? '',
    address: office?.address ?? '',
    hours: office?.hours ?? '',
  });
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));
  const body = (active: boolean) => ({
    name: form.name.trim(),
    hindiName: form.hindiName.trim() || null,
    district: form.district,
    category: form.category || null,
    wardId: form.wardId || null,
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
    address: form.address.trim() || null,
    hours: form.hours.trim() || null,
    active,
  });
  const save = (active: boolean) => {
    setBusy(true);
    api(office ? `/admin/offices/${office.id}` : '/admin/offices', {
      method: office ? 'PUT' : 'POST',
      body: body(active),
    })
      .then(() => {
        toast.success(active ? 'Office saved.' : 'Office removed from the app.');
        onSaved();
      })
      .catch(e => toast.error(errorMessage(e)))
      .finally(() => setBusy(false));
  };
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{office ? 'Edit office' : 'Add an office'}</DialogTitle>
          <DialogDescription>Shown to citizens on reports it is responsible for.</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1">
          <Field label="Office name">
            <Input value={form.name} onChange={e => set({ name: e.target.value })} />
          </Field>
          <Field label="Hindi name">
            <Input value={form.hindiName} onChange={e => set({ hindiName: e.target.value })} />
          </Field>
          <Field label="District">
            <Pick
              className="w-full"
              value={form.district}
              onChange={district => set({ district, wardId: '' })}
              options={DISTRICTS.map(d => ({ value: d.toLowerCase(), label: d }))}
            />
          </Field>
          <Field label="Category">
            <Pick
              className="w-full"
              value={form.category || 'all'}
              onChange={v => set({ category: v === 'all' ? '' : v })}
              options={[
                { value: 'all', label: 'All categories' },
                ...(categories.data?.categories ?? []).map(c => ({ value: c.name, label: c.name })),
              ]}
            />
          </Field>
          {form.district === 'haridwar' && (
            <Field label="Roorkee ward">
              <Pick
                className="w-full"
                value={form.wardId || 'all'}
                onChange={v => set({ wardId: v === 'all' ? '' : v })}
                options={[
                  { value: 'all', label: 'All wards' },
                  ...(wards.data?.wards ?? []).map(w => ({ value: w.id, label: `${w.number}. ${w.name}` })),
                ]}
              />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <Input value={form.phone} onChange={e => set({ phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={e => set({ email: e.target.value })} />
            </Field>
          </div>
          <Field label="Address">
            <Input value={form.address} onChange={e => set({ address: e.target.value })} />
          </Field>
          <Field label="Opening hours">
            <Input
              value={form.hours}
              onChange={e => set({ hours: e.target.value })}
              placeholder="Mon–Sat, 10:00–17:00"
            />
          </Field>
        </div>
        <DialogFooter>
          {office && (
            <Button
              variant="outline"
              className="mr-auto text-destructive"
              disabled={busy}
              onClick={() => save(false)}
            >
              Remove from app
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy || form.name.trim().length < 3} onClick={() => save(true)}>
            {busy ? 'Saving…' : 'Save office'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
