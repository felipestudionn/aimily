import { supabaseAdmin } from './supabase-admin';

/**
 * Log a sensitive action to the audit trail.
 * Fire-and-forget — never blocks the main flow.
 */
export async function logAudit(params: {
  userId: string;
  collectionPlanId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  try {
    await supabaseAdmin.from('audit_log').insert({
      user_id: params.userId,
      collection_plan_id: params.collectionPlanId || null,
      action: params.action,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
      metadata: params.metadata || {},
      ip_address: params.ipAddress || null,
    });
  } catch (err) {
    // Silent fail — audit logging should never break the main flow
    console.error('[AuditLog]', err);
  }
}

/**
 * Common audit actions for type safety.
 *
 * Marketing actions are grouped at the bottom and cover:
 * - AI generation costs (user-triggered, billed against plan)
 * - PII access (PR contacts contain influencer/media personal data)
 * - Financial events (paid campaigns budgets)
 * - Status transitions that leave the safe "draft" boundary
 */
export const AUDIT_ACTIONS = {
  // Production / SKU lifecycle
  PO_GENERATED: 'po_generated',
  PO_DOWNLOADED: 'po_downloaded',
  PRODUCTION_APPROVED: 'production_approved',
  SKU_DELETED: 'sku_deleted',
  COLLECTION_EXPORTED: 'collection_exported',
  DESIGN_PHASE_ADVANCED: 'design_phase_advanced',
  FACTORY_DETAILS_UPDATED: 'factory_details_updated',
  ACCOUNT_DELETED: 'account_deleted',

  // Marketing — AI generation (billed, plan-scoped)
  MARKETING_AI_STORIES: 'marketing_ai_stories',
  MARKETING_AI_GTM: 'marketing_ai_gtm',
  MARKETING_AI_CONTENT_CALENDAR: 'marketing_ai_content_calendar',
  MARKETING_AI_PAID: 'marketing_ai_paid',
  MARKETING_AI_LAUNCH: 'marketing_ai_launch',
  MARKETING_AI_COPY: 'marketing_ai_copy',
  MARKETING_AI_CONTENT_STRATEGY: 'marketing_ai_content_strategy',

  // Marketing — PII events (PR contacts = personal data)
  PR_CONTACT_CREATED: 'pr_contact_created',
  PR_CONTACT_UPDATED: 'pr_contact_updated',
  PR_CONTACT_DELETED: 'pr_contact_deleted',

  // Marketing — financial events
  PAID_CAMPAIGN_CREATED: 'paid_campaign_created',
  PAID_CAMPAIGN_UPDATED: 'paid_campaign_updated',
  PAID_CAMPAIGN_DELETED: 'paid_campaign_deleted',

  // Marketing — content state transitions
  CONTENT_PUBLISHED: 'content_published',
  LAUNCH_TASK_APPROVED: 'launch_task_approved',

  // Marketing — presentation & retrospective deliverables
  MARKETING_PRESENTATION_EXPORT: 'marketing_presentation_export',
  MARKETING_RETROSPECTIVE_EMAILED: 'marketing_retrospective_emailed',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
