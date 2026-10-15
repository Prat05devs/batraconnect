export class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export function createApiClient(base: string, fetcher: typeof fetch = fetch) {
  const url = base.replace(/\/$/, '');
  return async function request<T>(
    path: string,
    options: { method?: string; body?: unknown; token?: string; headers?: Record<string, string> } = {},
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const form = typeof FormData !== 'undefined' && options.body instanceof FormData;
      const response = await fetcher(`${url}/api/v1${path}`, {
        method: options.method ?? 'GET',
        signal: controller.signal,
        headers: {
          ...(options.body && !form ? { 'Content-Type': 'application/json' } : {}),
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
          ...options.headers,
        },
        body: options.body ? (form ? (options.body as FormData) : JSON.stringify(options.body)) : undefined,
      });
      if (response.status === 204) return undefined as T;
      const body = await response.json().catch(() => null);
      if (!response.ok)
        throw new ApiError(
          body?.error?.message ??
            (response.status === 429
              ? 'Too many requests. Please try again later.'
              : 'The request could not be completed.'),
          response.status,
          body?.error?.code ?? 'REQUEST_FAILED',
        );
      if (!body) throw new ApiError('The server returned an invalid response.', 502, 'INVALID_RESPONSE');
      return body as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        'Could not connect. Check your internet connection and try again.',
        0,
        'NETWORK_ERROR',
      );
    } finally {
      clearTimeout(timeout);
    }
  };
}
export type Role = 'citizen' | 'field' | 'department' | 'executive' | 'admin';
export type Jurisdiction = { district: string; category: string };
export type Account = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status?: 'active' | 'suspended' | 'deleted';
  language?: 'en' | 'hi';
  emailVerified?: boolean;
  phone?: string | null;
  phoneVerified?: boolean;
  jurisdictions?: Jurisdiction[];
};
export type Session = { token: string; user: Account; expiresAt: string };
export type ComplaintStatus = 'Submitted' | 'Assigned' | 'In progress' | 'Resolved' | 'Closed' | 'Reopened';
export type Ward = {
  id: string;
  district: string;
  town: string;
  number: number;
  name: string;
  hindiName: string | null;
  localities: string[];
  verified: boolean;
  active: boolean;
};
export type Office = {
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
export type Category = {
  name: string;
  hindiName: string;
  scope: 'state' | 'roorkee';
  slaHours: number;
  active: boolean;
  sort: number;
};
export type SubmittedComplaint = {
  id: string;
  reference: string;
  category: string;
  title: string;
  description: string;
  district: string;
  locality: string;
  status: ComplaintStatus;
  assignedTo: string | null;
  version: number;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  wardId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  dueAt?: string | null;
  overdue?: boolean;
  escalationLevel?: number;
  resolvedAt?: string | null;
  media?: { id: string; mimeType: string; size: number; purpose?: 'evidence' | 'resolution' }[];
  events?: {
    action: string;
    status: string;
    note: string;
    createdAt: string;
    actor?: string;
    mediaIds?: string[];
  }[];
  office?: Office | null;
  ward?: Ward | null;
  assignee?: { id: string; name: string } | null;
  mine?: boolean;
};
export type StaffMember = {
  id: string;
  name: string;
  role: string;
  district: string;
  category: string;
  openAssignments: number;
  overdueAssignments: number;
};
export type IdeaStatus =
  'Submitted' | 'Under review' | 'Accepted' | 'Implemented' | 'Not taken forward' | 'Hidden';
export type ServerIdea = {
  id: string;
  reference: string;
  category: string;
  title: string;
  description: string;
  district: string;
  status: IdeaStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  citizen?: string;
  mine?: boolean;
  events?: {
    action: string;
    status: string;
    note: string;
    visibleToCitizen: boolean;
    createdAt: string;
    fromOffice: boolean;
  }[];
};
export type Slot = {
  id: string;
  location: string;
  district: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  remaining: number | null;
  cancelled: boolean;
};
export type AppointmentStatus = 'Requested' | 'Confirmed' | 'Declined' | 'Cancelled' | 'Completed' | 'Missed';
export type Appointment = {
  id: string;
  reference: string;
  slotId: string;
  subject: string;
  notes: string;
  status: AppointmentStatus;
  officeNote: string | null;
  version: number;
  mine?: boolean;
  createdAt: string;
  updatedAt: string;
  slot: { location: string; district: string; startsAt: string; endsAt: string } | null;
  citizen?: string;
  citizenPhone?: string | null;
};
export type Bilingual = { en: string; hi?: string };
export type ContentType =
  'announcement' | 'achievement' | 'project' | 'profile' | 'photo' | 'scheme' | 'service';
export type ContentEntry = {
  id: string;
  type: ContentType;
  slug: string;
  title: Bilingual;
  summary: Bilingual | null;
  body: Bilingual | null;
  fields: Record<string, string | number | boolean | null>;
  mediaIds: string[];
  sourceUrl: string | null;
  sort: number;
  publishedAt: string | null;
  updatedAt: string;
  status?: 'draft' | 'published' | 'archived';
  version?: number;
};
export type Breakdown = {
  key: string;
  total: number;
  open: number;
  overdue: number;
  avgResolutionHours: number | null;
  withinSlaPercent: number | null;
};
export type Insights = {
  byStatus: { status: string; count: number }[];
  totals: { total: number; open: number; overdue: number; escalated: number };
  byCategory: Breakdown[];
  byDistrict: Breakdown[];
  trend: { week: string; created: number; resolved: number }[];
  engagement: {
    ideas: { status: string; count: number }[];
    appointments: { status: string; count: number }[];
  } | null;
};
export type Notification = {
  id: string;
  link: string | null;
  message: string;
  read_at: string | null;
  created_at: string;
};
export const isStaff = (role?: Role) => !!role && role !== 'citizen';
/** Everyone except the executive/minister level can report, suggest and book as a resident. */
export const canActAsResident = (role?: Role) => role !== 'executive';
