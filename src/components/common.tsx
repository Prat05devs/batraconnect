'use client';
import type React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

export const formatDate = (iso?: string | null) =>
  iso
    ? `${new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST`
    : '—';
export const formatDay = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' }) : '—';
export const titleCase = (value: string) => value.replace(/\b\w/g, c => c.toUpperCase());
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
const tones: Record<string, string> = {
  Submitted: 'bg-blue-50 text-blue-700',
  Assigned: 'bg-violet-50 text-violet-700',
  'In progress': 'bg-amber-50 text-amber-800',
  Resolved: 'bg-emerald-50 text-emerald-700',
  Closed: 'bg-slate-100 text-slate-700',
  Reopened: 'bg-red-50 text-red-700',
  active: 'bg-emerald-50 text-emerald-700',
  suspended: 'bg-red-50 text-red-700',
  sent: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-800',
  failed: 'bg-red-50 text-red-700',
  skipped: 'bg-slate-100 text-slate-700',
  overdue: 'bg-red-50 text-red-700',
  dashboard: 'bg-emerald-50 text-emerald-700',
  server: 'bg-blue-50 text-blue-700',
  none: 'bg-red-50 text-red-700',
};
export function StatusBadge({ value, label }: { value: string; label?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn('border-transparent font-medium', tones[value] ?? 'bg-muted text-foreground')}
    >
      {label ?? value}
    </Badge>
  );
}
export function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'danger' | 'good';
}) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="px-5">
        <div
          className={cn(
            'text-3xl font-bold',
            tone === 'danger' && 'text-destructive',
            tone === 'good' && 'text-emerald-700',
          )}
        >
          {value}
        </div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
export function DataState({
  loading,
  error,
  empty,
  emptyText = 'Nothing to show yet.',
}: {
  loading: boolean;
  error: unknown;
  empty?: boolean;
  emptyText?: string;
}) {
  if (loading)
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading…
      </div>
    );
  if (error)
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
        <AlertTriangle className="size-4" />
        {errorMessage(error)}
      </div>
    );
  if (empty) return <div className="py-10 text-center text-sm text-muted-foreground">{emptyText}</div>;
  return null;
}
/** A labelled form row. The <label> wraps its control, so clicking the text focuses it and screen readers announce it. */
export function Field({
  label,
  className,
  children,
}: {
  label: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn('grid gap-1.5', className)}>
      <span className="text-sm leading-none font-medium select-none">{label}</span>
      {children}
    </label>
  );
}
/** Dropdown built on the shadcn (Base UI) Select: shows labels, never returns null. */
export function Pick({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <Select value={value || null} onValueChange={v => onChange(v ?? '')} items={options}>
      <SelectTrigger className={cn('h-9', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(o => (
          <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
