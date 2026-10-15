import { z } from 'zod';
export const staffRoles = ['field', 'department', 'executive', 'admin'];
export const email = z.string().trim().toLowerCase().email().max(254);
export const password = z.string().min(12).max(128);
export const phone = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, 'Use international format, for example +919876543210.');
export const code = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code.');
const name = z.string().trim().min(2).max(100);
const text = (min, max) => z.string().trim().min(min).max(max);
const uuid = z.string().uuid();
const version = z.number().int().positive();
const iso = z.string().datetime({ offset: true });
export const registration = z.object({ name, email, password, phone: phone.optional() }).strict();
export const login = z.object({ email, password: z.string().min(1).max(128) }).strict();
export const otpRequest = z.object({ destination: z.union([email, phone]) }).strict();
export const otpVerify = z.object({ destination: z.union([email, phone]), code }).strict();
export const verifyRequest = z.object({ channel: z.enum(['email', 'phone']) }).strict();
export const verifyConfirm = z.object({ channel: z.enum(['email', 'phone']), code }).strict();
export const forgot = z.object({ email }).strict();
export const reset = z.object({ email, code, password }).strict();
export const accountUpdate = z
  .object({
    name: name.optional(),
    language: z.enum(['en', 'hi']).optional(),
    phone: phone.nullable().optional(),
    email: email.optional(),
    currentPassword: z.string().min(1).max(128).optional(),
  })
  .strict()
  .refine(v => !v.email || v.currentPassword, 'currentPassword is required to change email.');
export const passwordChange = z
  .object({ currentPassword: z.string().min(1).max(128), newPassword: password })
  .strict();
export const accountDelete = z
  .object({ password: z.string().min(1).max(128), confirm: z.literal('DELETE') })
  .strict();
const jurisdiction = z.object({ district: text(1, 80), category: text(1, 60) }).strict();
export const staffCreate = z
  .object({
    name,
    email,
    phone: phone.optional(),
    role: z.enum(staffRoles),
    jurisdictions: z.array(jurisdiction).max(50).default([]),
  })
  .strict();
export const staffUpdate = z
  .object({
    name: name.optional(),
    role: z.enum(staffRoles).optional(),
    status: z.enum(['active', 'suspended']).optional(),
    jurisdictions: z.array(jurisdiction).max(50).optional(),
  })
  .strict();
const coordinate = {
  latitude: z.number().min(6).max(38).optional(),
  longitude: z.number().min(68).max(98).optional(),
};
export const complaint = z
  .object({
    category: text(1, 60),
    title: text(5, 100),
    description: text(20, 1000),
    district: text(1, 80),
    locality: text(3, 160),
    wardId: z.string().max(40).optional(),
    ...coordinate,
    mediaIds: z.array(uuid).max(3).default([]),
  })
  .strict()
  .refine(v => new Set(v.mediaIds).size === v.mediaIds.length, 'Duplicate media is not allowed.')
  .refine(
    v => (v.latitude === undefined) === (v.longitude === undefined),
    'Provide both latitude and longitude.',
  );
export const assignment = z.object({ assigneeId: uuid, version, note: text(5, 1000) }).strict();
export const transition = z
  .object({
    status: z.enum(['In progress', 'Resolved', 'Closed', 'Reopened']),
    version,
    note: text(10, 1000),
    mediaIds: z.array(uuid).max(3).default([]),
  })
  .strict();
export const complaintFilters = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(30),
    offset: z.coerce.number().int().min(0).max(100000).default(0),
    q: z.string().trim().max(100).optional(),
    status: z.enum(['Submitted', 'Assigned', 'In progress', 'Resolved', 'Closed', 'Reopened']).optional(),
    category: z.string().max(60).optional(),
    district: z.string().max(80).optional(),
    wardId: z.string().max(40).optional(),
    overdue: z.enum(['true', 'false']).optional(),
    own: z.enum(['true', 'false']).optional(),
    escalated: z.enum(['true', 'false']).optional(),
    mine: z.enum(['true', 'false']).optional(),
    from: iso.optional(),
    to: iso.optional(),
    sort: z.enum(['newest', 'oldest', 'due']).default('newest'),
  })
  .strip();
const ideaCategories = ['Public spaces', 'Transport', 'Digital services', 'Environment', 'Other'];
export const idea = z
  .object({
    category: z.enum(ideaCategories),
    title: text(5, 100),
    description: text(20, 2000),
    district: text(1, 80),
  })
  .strict();
export const ideaReview = z
  .object({
    status: z.enum(['Under review', 'Accepted', 'Implemented', 'Not taken forward', 'Hidden']),
    version,
    note: text(5, 1000),
    visibleToCitizen: z.boolean().default(true),
  })
  .strict();
export const slot = z
  .object({
    location: text(3, 200),
    district: text(1, 80),
    startsAt: iso,
    endsAt: iso,
    capacity: z.number().int().min(1).max(200),
  })
  .strict()
  .refine(
    v =>
      Date.parse(v.endsAt) > Date.parse(v.startsAt) &&
      Date.parse(v.endsAt) - Date.parse(v.startsAt) <= 12 * 3600000,
    'A slot must end after it starts and last at most 12 hours.',
  );
export const booking = z.object({ slotId: uuid, subject: text(5, 100), notes: text(20, 2000) }).strict();
export const reschedule = z.object({ slotId: uuid, version }).strict();
export const appointmentDecision = z
  .object({
    status: z.enum(['Confirmed', 'Declined', 'Completed', 'Missed']),
    version,
    note: text(3, 500).optional(),
  })
  .strict();
export const contentTypes = ['announcement', 'achievement', 'project', 'profile', 'photo'];
const bilingual = z.object({ en: text(1, 20000), hi: z.string().trim().max(20000).optional() }).strict();
export const contentEntry = z
  .object({
    type: z.enum(contentTypes),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9][a-z0-9-]{1,79}$/),
    title: bilingual,
    body: bilingual.optional(),
    summary: bilingual.optional(),
    fields: z
      .record(z.string().max(60), z.union([z.string().max(2000), z.number(), z.boolean(), z.null()]))
      .refine(v => Object.keys(v).length <= 40, 'At most 40 fields.')
      .default({}),
    mediaIds: z.array(uuid).max(20).default([]),
    sourceUrl: z
      .string()
      .url()
      .max(500)
      .refine(v => v.startsWith('https://'), 'Use an https:// source.')
      .optional(),
    sort: z.number().int().min(-10000).max(10000).default(0),
    status: z.enum(['draft', 'published', 'archived']).default('draft'),
  })
  .strict();
export const contentUpdate = contentEntry.extend({ version }).strict();
export const pushToken = z
  .object({
    token: z
      .string()
      .trim()
      .min(10)
      .max(300)
      .regex(/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/, 'Use an Expo push token.'),
    platform: z.enum(['ios', 'android', 'web']),
  })
  .strict();
export const preferences = z
  .object({ push: z.boolean().optional(), email: z.boolean().optional(), sms: z.boolean().optional() })
  .strict();
export const categoryUpdate = z
  .object({
    hindiName: text(1, 80).optional(),
    slaHours: z.number().int().min(1).max(2160).optional(),
    active: z.boolean().optional(),
    scope: z.enum(['state', 'roorkee']).optional(),
    sort: z.number().int().min(0).max(1000).optional(),
  })
  .strict();
export const categoryCreate = z
  .object({
    name: text(2, 60),
    hindiName: text(1, 80),
    slaHours: z.number().int().min(1).max(2160),
    scope: z.enum(['state', 'roorkee']),
    sort: z.number().int().min(0).max(1000).default(100),
  })
  .strict();
export const wardUpdate = z
  .object({
    name: text(2, 100).optional(),
    hindiName: z.string().trim().max(100).nullable().optional(),
    localities: z.array(text(2, 100)).max(200).optional(),
    verified: z.boolean().optional(),
    active: z.boolean().optional(),
  })
  .strict();
export const office = z
  .object({
    name: text(3, 160),
    hindiName: z.string().trim().max(160).nullable().optional(),
    district: text(1, 80),
    category: z.string().max(60).nullable().optional(),
    wardId: z.string().max(40).nullable().optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    email: email.nullable().optional(),
    address: z.string().trim().max(300).nullable().optional(),
    hours: z.string().trim().max(160).nullable().optional(),
    active: z.boolean().default(true),
  })
  .strict();
export function parse(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      result.error.issues.map(i => `${i.path.join('.') || 'request'}: ${i.message}`).join('; '),
    );
  return result.data;
}
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export const requireCondition = (condition, status, code, message) => {
  if (!condition) throw new ApiError(status, code, message);
};
export const placeKey = value =>
  value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-IN');
export const covers = (user, row) =>
  (user.jurisdictions ?? []).some(j => j.district === row.district && j.category === row.category);
export function canRead(user, row) {
  if (row.citizen_id === user.id) return true;
  if (user.role === 'admin' || user.role === 'executive') return true;
  if (user.role === 'citizen') return row.citizen_id === user.id;
  if (user.role === 'field') return row.assigned_to === user.id;
  return user.role === 'department' && covers(user, row);
}
const open = status => !['Resolved', 'Closed'].includes(status);
export const complaintView = row => ({
  id: row.id,
  reference: row.reference,
  category: row.category,
  title: row.title,
  description: row.description,
  district: row.district,
  locality: row.locality,
  wardId: row.ward_id ?? null,
  latitude: row.latitude ?? null,
  longitude: row.longitude ?? null,
  status: row.status,
  assignedTo: row.assigned_to,
  version: row.version,
  resolution: row.resolution,
  dueAt: row.due_at ?? null,
  overdue: !!row.due_at && open(row.status) && Date.parse(row.due_at) < Date.now(),
  escalationLevel: row.escalation_level ?? 0,
  resolvedAt: row.resolved_at ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
