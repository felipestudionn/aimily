// ── Launch Command Center Types ──

export type LaunchTab = 'pre_launch' | 'launch_day' | 'post_launch';

// ── Pre-Launch ──

export type PhaseReadiness = 'ready' | 'at_risk' | 'blocked' | 'not_started';

export interface PhaseGoNoGo {
  phase: string;
  label: string;
  labelEs: string;
  icon: string;
  color: string;
  totalMilestones: number;
  completedMilestones: number;
  inProgressMilestones: number;
  progress: number;
  readiness: PhaseReadiness;
}

// ── Launch Day ──

export interface LaunchIssue {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved';
  description: string;
  created_at: string;
}

export interface LaunchTask {
  id: string;
  title: string;
  assignee: string;
  status: 'pending' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
}

export interface QuickLink {
  id: string;
  label: string;
  url: string;
  platform: string;
}

// ── Post-Launch ──

export interface SalesEntry {
  id: string;
  date: string;
  channel: string;
  units: number;
  revenue: number;
  currency: string;
}

export interface LessonLearned {
  id: string;
  category: 'product' | 'marketing' | 'production' | 'logistics' | 'digital' | 'other';
  type: 'success' | 'improvement' | 'issue';
  title: string;
  description: string;
}

// ── Config arrays ──

export const ISSUE_SEVERITIES: { id: LaunchIssue['severity']; label: string; color: string }[] = [
  { id: 'low', label: 'Low', color: '#94A3B8' },
  { id: 'medium', label: 'Medium', color: '#F59E0B' },
  { id: 'high', label: 'High', color: '#EF4444' },
  { id: 'critical', label: 'Critical', color: '#7F1D1D' },
];

export const ISSUE_STATUSES: { id: LaunchIssue['status']; label: string; color: string }[] = [
  { id: 'open', label: 'Open', color: '#EF4444' },
  { id: 'in_progress', label: 'In Progress', color: '#F59E0B' },
  { id: 'resolved', label: 'Resolved', color: '#10B981' },
];

export const TASK_PRIORITIES: { id: LaunchTask['priority']; label: string; color: string }[] = [
  { id: 'low', label: 'Low', color: '#94A3B8' },
  { id: 'medium', label: 'Medium', color: '#F59E0B' },
  { id: 'high', label: 'High', color: '#EF4444' },
];

export const SALES_CHANNELS = [
  'Website',
  'Instagram Shop',
  'TikTok Shop',
  'Wholesale',
  'Pop-up / Retail',
  'Other',
] as const;

export const LESSON_CATEGORIES: { id: LessonLearned['category']; label: string; labelEs: string }[] = [
  { id: 'product', label: 'Product', labelEs: 'Producto' },
  { id: 'marketing', label: 'Marketing', labelEs: 'Marketing' },
  { id: 'production', label: 'Production', labelEs: 'Produccion' },
  { id: 'logistics', label: 'Logistics', labelEs: 'Logistica' },
  { id: 'digital', label: 'Digital', labelEs: 'Digital' },
  { id: 'other', label: 'Other', labelEs: 'Otro' },
];

export const LESSON_TYPES: { id: LessonLearned['type']; label: string; color: string; emoji: string }[] = [
  { id: 'success', label: 'What went well', color: '#10B981', emoji: '✅' },
  { id: 'improvement', label: 'Could improve', color: '#F59E0B', emoji: '💡' },
  { id: 'issue', label: 'Issue / Problem', color: '#EF4444', emoji: '⚠️' },
];

export const CURRENCIES = ['EUR', 'USD', 'GBP'] as const;
