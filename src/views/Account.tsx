'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader, Field } from '@/components/common';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export function Account() {
  const { user } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <>
      <PageHeader title="My account" description={`${user?.name} · ${user?.email}`} />
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Change my password</CardTitle>
          <CardDescription>
            At least 12 characters. Your other signed-in browsers and phones will be signed out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={e => {
              e.preventDefault();
              setBusy(true);
              api('/account/password', {
                method: 'POST',
                body: { currentPassword: current, newPassword: next },
              })
                .then(() => {
                  toast.success('Password changed.');
                  setCurrent('');
                  setNext('');
                })
                .catch(err => toast.error(errorMessage(err)))
                .finally(() => setBusy(false));
            }}
          >
            <Field label="Current password">
              <Input
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={e => setCurrent(e.target.value)}
              />
            </Field>
            <Field label="New password">
              <Input
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={e => setNext(e.target.value)}
              />
            </Field>
            <Button type="submit" disabled={busy || !current || next.length < 12}>
              {busy ? 'Saving…' : 'Change password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
