export type Complaint = {
  id: string;
  reference: string;
  category: string;
  title: string;
  description: string;
  district: string;
  locality: string;
  status: string;
  assignedTo: string | null;
  version: number;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  dueAt?: string | null;
  overdue?: boolean;
  escalationLevel?: number;
  resolvedAt?: string | null;
  ward?: { name: string } | null;
  office?: { name: string; phone: string | null } | null;
  assignee?: { id: string; name: string } | null;
  events?: { action: string; status: string; note: string; createdAt: string; actor?: string }[];
  media?: { id: string; purpose?: string }[];
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
export type Category = {
  name: string;
  hindiName: string;
  scope: string;
  slaHours: number;
  active: boolean;
  sort: number;
};
export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  phone: string | null;
  jurisdictions: { district: string; category: string }[];
  createdAt: string;
  openAssignments: number;
};
export const ROLE_LABEL: Record<string, string> = {
  citizen: 'Citizen',
  field: 'Field officer',
  department: 'Nodal / department',
  executive: 'Minister / executive',
  editor: 'Content editor',
  admin: 'Administrator',
};
export const STATUSES = ['Submitted', 'Assigned', 'In progress', 'Resolved', 'Reopened', 'Closed'];
export const DISTRICTS = [
  'Almora',
  'Bageshwar',
  'Chamoli',
  'Champawat',
  'Dehradun',
  'Haridwar',
  'Nainital',
  'Pauri Garhwal',
  'Pithoragarh',
  'Rudraprayag',
  'Tehri Garhwal',
  'Udham Singh Nagar',
  'Uttarkashi',
];
