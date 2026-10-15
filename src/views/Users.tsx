'use client';
import { useState } from 'react';
import { KeyRound, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataState, PageHeader, Pick, StatusBadge, formatDate, titleCase, Field } from '@/components/common';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { DISTRICTS, ROLE_LABEL, type Category, type User } from '@/lib/types';

/** One line per district, e.g. "Haridwar · 5 categories"; the full list is in the cell's tooltip. */
const areaSummary = (list: User['jurisdictions']) => {
  if (!list.length) return '—';
  const byDistrict = new Map<string, string[]>();
  for (const j of list) byDistrict.set(j.district, [...(byDistrict.get(j.district) ?? []), j.category]);
  return [...byDistrict]
    .map(
      ([district, cats]) =>
        `${titleCase(district)} · ${cats.length === 1 ? cats[0] : `${cats.length} categories`}`,
    )
    .join(', ');
};
const strongPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return `Bc-${[...bytes].map(b => chars[b % chars.length]).join('')}`;
};
export function Users() {
  const { user: me } = useAuth();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('staff');
  const list = useApi<{ users: User[]; total: number }>(
    `/admin/users?${new URLSearchParams({ limit: '100', ...(search ? { q: search } : {}), ...(role !== 'staff' ? { role } : {}) })}`,
  );
  const [resetting, setResetting] = useState<User | null>(null);
  const [adding, setAdding] = useState(false);
  async function toggle(u: User) {
    try {
      await api(`/admin/users/${u.id}`, {
        method: 'PATCH',
        body: { status: u.status === 'suspended' ? 'active' : 'suspended' },
      });
      toast.success(
        u.status === 'suspended' ? 'Account reactivated.' : 'Account suspended and signed out everywhere.',
      );
      void list.reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  return (
    <>
      <PageHeader
        title="Users"
        description="Staff and citizen accounts. Any administrator can reset another person's password here."
        actions={
          <Button onClick={() => setAdding(true)}>
            <UserPlus className="size-4" />
            Add staff member
          </Button>
        }
      />
      <Card className="mb-6 flex-row flex-wrap items-end gap-4 px-4 py-4">
        <form
          onSubmit={e => {
            e.preventDefault();
            setSearch(q.trim());
          }}
        >
          <Field label="Search">
            <Input
              className="w-72"
              placeholder="Name, email or mobile"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </Field>
        </form>
        <Field label="Show">
          <Pick
            className="w-52"
            value={role}
            onChange={setRole}
            options={[
              { value: 'staff', label: 'All staff' },
              ...Object.entries(ROLE_LABEL).map(([v, l]) => ({
                value: v,
                label: v === 'citizen' ? 'Citizens' : l,
              })),
            ]}
          />
        </Field>
      </Card>
      <DataState
        loading={list.loading && !list.data}
        error={list.error}
        empty={list.data?.users.length === 0}
        emptyText="No accounts found."
      />
      {!!list.data?.users.length && (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.users.map(u => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">
                      {u.name}
                      {u.id === me?.id && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {u.email}
                      {u.phone ? ` · ${u.phone}` : ''}
                    </div>
                  </TableCell>
                  <TableCell>{ROLE_LABEL[u.role] ?? u.role}</TableCell>
                  <TableCell
                    className="text-xs whitespace-normal text-muted-foreground"
                    title={u.jurisdictions.map(j => `${titleCase(j.district)} – ${j.category}`).join('\n')}
                  >
                    {areaSummary(u.jurisdictions)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={u.status} label={titleCase(u.status)} />
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(u.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {u.id !== me?.id && (
                        <Button variant="outline" size="sm" onClick={() => setResetting(u)}>
                          <KeyRound className="size-4" />
                          Reset password
                        </Button>
                      )}
                      {u.id !== me?.id && u.role !== 'citizen' && (
                        <Button
                          variant={u.status === 'suspended' ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => void toggle(u)}
                        >
                          {u.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      {resetting && <ResetPassword user={resetting} onClose={() => setResetting(null)} />}
      {adding && (
        <AddStaff
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            void list.reload();
          }}
        />
      )}
    </>
  );
}
function ResetPassword({ user, onClose }: { user: User; onClose: () => void }) {
  const [password, setPassword] = useState(strongPassword);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password for {user.name}</DialogTitle>
          <DialogDescription>
            {done
              ? 'Share this password with them privately. They are signed out everywhere and can change it from their account.'
              : 'Set a new password, then share it with them privately. Their current sessions will end.'}
          </DialogDescription>
        </DialogHeader>
        <Field label="New password (12+ characters)">
          <div className="flex gap-2">
            <Input
              value={password}
              onChange={e => setPassword(e.target.value)}
              readOnly={done}
              className="font-mono"
            />
            {!done && (
              <Button variant="outline" onClick={() => setPassword(strongPassword())}>
                Generate
              </Button>
            )}
          </div>
        </Field>
        <DialogFooter>
          {done ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(password);
                  toast.success('Copied.');
                }}
              >
                Copy
              </Button>
              <Button onClick={onClose}>Done</Button>
            </>
          ) : (
            <Button
              disabled={busy || password.length < 12}
              onClick={() => {
                setBusy(true);
                api(`/admin/users/${user.id}/password`, { method: 'POST', body: { password } })
                  .then(() => {
                    setDone(true);
                    toast.success('Password reset.');
                  })
                  .catch(e => toast.error(errorMessage(e)))
                  .finally(() => setBusy(false));
              }}
            >
              {busy ? 'Saving…' : 'Reset password'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function AddStaff({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const categories = useApi<{ categories: Category[] }>('/categories');
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'field',
    district: 'Haridwar',
    categories: [] as string[],
  });
  const [busy, setBusy] = useState(false);
  const scoped = form.role === 'field' || form.role === 'department';
  const set = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a staff member</DialogTitle>
          <DialogDescription>
            They receive an email with a code to set their own password (“Forgot password” in the app). You
            can also set one for them afterwards with Reset password.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Name">
            <Input value={form.name} onChange={e => set({ name: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={e => set({ email: e.target.value })} />
          </Field>
          <Field label="Role">
            <Pick
              className="w-full"
              value={form.role}
              onChange={role => set({ role })}
              options={['field', 'department', 'executive', 'editor', 'admin'].map(r => ({
                value: r,
                label: ROLE_LABEL[r],
              }))}
            />
          </Field>
          {scoped && (
            <>
              <Field label="District">
                <Pick
                  className="w-full"
                  value={form.district}
                  onChange={district => set({ district })}
                  options={DISTRICTS.map(d => ({ value: d, label: d }))}
                />
              </Field>
              <div role="group" aria-label="Categories they handle" className="grid gap-1.5">
                <span className="text-sm leading-none font-medium">Categories they handle</span>
                <div className="flex flex-wrap gap-2">
                  {categories.data?.categories.map(c => {
                    const on = form.categories.includes(c.name);
                    return (
                      <Button
                        key={c.name}
                        type="button"
                        size="sm"
                        variant={on ? 'default' : 'outline'}
                        aria-pressed={on}
                        onClick={() =>
                          set({
                            categories: on
                              ? form.categories.filter(x => x !== c.name)
                              : [...form.categories, c.name],
                          })
                        }
                      >
                        {c.name}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={
              busy ||
              form.name.trim().length < 2 ||
              !form.email.includes('@') ||
              (scoped && !form.categories.length)
            }
            onClick={() => {
              setBusy(true);
              api('/admin/users', {
                method: 'POST',
                body: {
                  name: form.name.trim(),
                  email: form.email.trim().toLowerCase(),
                  role: form.role,
                  jurisdictions: scoped
                    ? form.categories.map(category => ({ district: form.district, category }))
                    : [],
                },
              })
                .then(() => {
                  toast.success('Staff member added and invited.');
                  onDone();
                })
                .catch(e => toast.error(errorMessage(e)))
                .finally(() => setBusy(false));
            }}
          >
            {busy ? 'Adding…' : 'Add and send invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
