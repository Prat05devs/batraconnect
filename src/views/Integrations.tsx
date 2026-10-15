'use client';
import { useState } from 'react';
import { RotateCcw, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DataState, PageHeader, StatusBadge, formatDate, Field } from '@/components/common';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/use-api';

type Secret = { set: boolean; hint?: string };
type Integration = Record<string, unknown> & {
  secrets: Record<string, Secret>;
  source: 'dashboard' | 'server' | 'none';
  updatedAt: string | null;
};
type Field = { key: string; label: string; secret?: boolean; placeholder: string; help?: string };
const CONFIG: Record<
  'email' | 'sms' | 'push',
  { title: string; description: string; testLabel: string; testPlaceholder: string; fields: Field[] }
> = {
  email: {
    title: 'Email',
    description: 'Verification codes, password resets, staff invitations and email updates.',
    testLabel: 'Send a test email to',
    testPlaceholder: 'you@example.in',
    fields: [
      {
        key: 'smtpUrl',
        label: 'SMTP address',
        secret: true,
        placeholder: 'smtps://username:password@smtp.provider.com:465',
        help: 'From your email provider (Amazon SES, Zoho, Gmail Workspace relay…).',
      },
      { key: 'from', label: 'Sender', placeholder: 'Batra Connect <no-reply@yourdomain.in>' },
    ],
  },
  sms: {
    title: 'SMS (Twilio)',
    description:
      'Sign-in codes by SMS and SMS updates. Indian numbers also need DLT-registered templates with your provider.',
    testLabel: 'Send a test SMS to',
    testPlaceholder: '+919876543210',
    fields: [
      { key: 'accountSid', label: 'Account SID', placeholder: 'AC…' },
      { key: 'authToken', label: 'Auth token', secret: true, placeholder: 'Paste the auth token' },
      { key: 'from', label: 'Sender number', placeholder: '+1…' },
    ],
  },
  push: {
    title: 'Push notifications (Expo)',
    description:
      'Phone notifications. Works without a token; add one if "enhanced push security" is on in your Expo account.',
    testLabel: 'Send a test push to device token',
    testPlaceholder: 'ExponentPushToken[…]',
    fields: [
      {
        key: 'expoAccessToken',
        label: 'Expo access token',
        secret: true,
        placeholder: 'Paste the access token',
      },
    ],
  },
};
const SOURCE: Record<string, string> = {
  dashboard: 'Set here',
  server: 'Set on the server',
  none: 'Not set up',
};
export function Integrations() {
  const list = useApi<{ integrations: Record<'email' | 'sms' | 'push', Integration> }>('/admin/integrations');
  return (
    <>
      <PageHeader
        title="Integrations"
        description="Keys for email, SMS and push. Changes apply immediately — no developer or restart needed. Saved keys are encrypted and are never shown again."
      />
      <DataState loading={list.loading && !list.data} error={list.error} />
      {list.data && (
        <div className="grid gap-6">
          {(Object.keys(CONFIG) as ('email' | 'sms' | 'push')[]).map(name => (
            <IntegrationCard
              key={name}
              name={name}
              value={list.data!.integrations[name]}
              onSaved={() => void list.reload()}
            />
          ))}
        </div>
      )}
    </>
  );
}
function IntegrationCard({
  name,
  value,
  onSaved,
}: {
  name: 'email' | 'sms' | 'push';
  value: Integration;
  onSaved: () => void;
}) {
  const config = CONFIG[name];
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState<{ ok: boolean; error: string | null } | null>(null);
  async function save() {
    const values: Record<string, string> = {},
      secrets: Record<string, string> = {};
    for (const f of config.fields)
      if (draft[f.key] !== undefined) (f.secret ? secrets : values)[f.key] = draft[f.key].trim();
    setBusy('save');
    try {
      await api(`/admin/integrations/${name}`, { method: 'PUT', body: { values, secrets } });
      setDraft({});
      toast.success(`${config.title} saved.`);
      onSaved();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy('');
    }
  }
  async function test() {
    setBusy('test');
    setResult(null);
    try {
      setResult(await api(`/admin/integrations/${name}/test`, { method: 'POST', body: { to: to.trim() } }));
    } catch (e) {
      setResult({ ok: false, error: errorMessage(e) });
    } finally {
      setBusy('');
    }
  }
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{config.title}</CardTitle>
          <StatusBadge
            value={name === 'push' && value.source === 'none' ? 'server' : value.source}
            label={
              name === 'push' && value.source === 'none' ? 'Working (no key needed)' : SOURCE[value.source]
            }
          />
        </div>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {config.fields.map(f => {
          const secret = value.secrets?.[f.key];
          return (
            <Field key={f.key} label={f.label}>
              <Input
                type={f.secret ? 'password' : 'text'}
                autoComplete="off"
                placeholder={
                  f.secret && secret?.set ? `Saved (${secret.hint}) — type to replace` : f.placeholder
                }
                value={draft[f.key] ?? (f.secret ? '' : String(value[f.key] ?? ''))}
                onChange={e => setDraft({ ...draft, [f.key]: e.target.value })}
              />
              {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
            </Field>
          );
        })}
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy !== '' || !Object.keys(draft).length} onClick={() => void save()}>
            {busy === 'save' ? 'Saving…' : 'Save'}
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              api(`/admin/settings/integration.${name}/restore`, { method: 'POST' })
                .then(() => {
                  toast.success('Previous keys restored.');
                  onSaved();
                })
                .catch(e => toast.error(errorMessage(e)))
            }
          >
            <RotateCcw className="size-4" />
            Restore previous
          </Button>
          <span className="self-center text-xs text-muted-foreground">
            Last changed {formatDate(value.updatedAt)}
          </span>
        </div>
        <Field label={config.testLabel} className="border-t pt-4">
          <div className="flex flex-wrap gap-2">
            <Input
              className="max-w-sm"
              placeholder={config.testPlaceholder}
              value={to}
              onChange={e => setTo(e.target.value)}
            />
            <Button
              variant="secondary"
              disabled={busy !== '' || to.trim().length < 3}
              onClick={() => void test()}
            >
              <Send className="size-4" />
              {busy === 'test' ? 'Sending…' : 'Send test'}
            </Button>
          </div>
          {result && (
            <p
              className={`rounded-md p-2 text-sm ${result.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}
            >
              {result.ok ? 'Sent. Check that it arrived.' : `Not sent: ${result.error}`}
            </p>
          )}
        </Field>
      </CardContent>
    </Card>
  );
}
