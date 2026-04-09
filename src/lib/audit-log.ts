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
 * Common audit actions for type safety
 */
export const AUDIT_ACTIONS = {
  PO_GENERATED: 'po_generated',
  PO_DOWNLOADED: 'po_downloaded',
  PRODUCTION_APPROVED: 'production_approved',
  SKU_DELETED: 'sku_deleted',
  COLLECTION_EXPORTED: 'collection_exported',
  DESIGN_PHASE_ADVANCED: 'design_phase_advanced',
  FACTORY_DETAILS_UPDATED: 'factory_details_updated',
  ACCOUNT_DELETED: 'account_deleted',
} as const;
