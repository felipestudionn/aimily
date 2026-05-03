/**
 * Tech-pack approval workflow notifications.
 *
 * Fires when a revision changes stage:
 *   - submitted from draft  → email reviewers (everyone with approve_production)
 *   - approved a stage      → email the next-stage reviewers
 *   - reached 'approved'    → email the designer (creator)
 *   - rejected              → email the designer with the rejection notes
 *
 * Soft-fails when RESEND_API_KEY is missing — never blocks the
 * approval transition.
 */

import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase-admin';

const FROM = 'aimily <hello@aimily.app>';
const REPLY_TO = 'hello@aimily.app';
const COLOR_BG = '#282A29';
const COLOR_FG = '#FAEFE0';
const LOGO_WHITE_URL = 'https://www.aimily.app/images/aimily-logo-white.png';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[approval-email] RESEND_API_KEY missing — email skipped');
    return null;
  }
  return new Resend(key);
}

type ApprovalStage =
  | 'draft'
  | 'design_review'
  | 'merch_review'
  | 'production_review'
  | 'approved'
  | 'rejected'
  | 'archived';

const STAGE_LABEL: Record<ApprovalStage, string> = {
  draft: 'Draft',
  design_review: 'Design Review',
  merch_review: 'Merch Review',
  production_review: 'Production Review',
  approved: 'Approved',
  rejected: 'Rejected',
  archived: 'Archived',
};

interface NotifyParams {
  collectionPlanId: string;
  skuId: string;
  revisionId: string;
  version: string;
  stage: ApprovalStage;
  notes?: string | null;
  triggeredBy: string;        // user id of the person who acted
  triggeredByName?: string | null;
}

/**
 * Resolve the recipient email list for a given stage transition.
 *
 * Today: email the collection owner. Future enhancement (Critical 6
 * in the long-term plan) lets you configure per-stage reviewer pools
 * — when that lands, this function becomes the integration point.
 *
 * Skips the user who triggered the change (no self-notifications).
 */
async function resolveRecipients(collectionPlanId: string, triggeredBy: string): Promise<Array<{ email: string; name: string | null }>> {
  const { data: plan } = await supabaseAdmin
    .from('collection_plans')
    .select('user_id, name')
    .eq('id', collectionPlanId)
    .maybeSingle();
  if (!plan) return [];

  const recipients: Array<{ email: string; name: string | null }> = [];
  if (plan.user_id !== triggeredBy) {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(plan.user_id);
    if (u?.user?.email) {
      recipients.push({
        email: u.user.email,
        name: (u.user.user_metadata?.full_name as string | undefined) ?? null,
      });
    }
  }
  return recipients;
}

interface ShellParams {
  greeting: string;
  headline: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaHref: string;
}

function shell({ greeting, headline, bodyHtml, ctaLabel, ctaHref }: ShellParams): string {
  return `<!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background-color:${COLOR_BG};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLOR_BG};padding:48px 24px;">
    <tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">
      <tr><td align="center" style="padding-bottom:32px;"><img src="${LOGO_WHITE_URL}" alt="aimily" width="80"/></td></tr>
      <tr><td>
        <p style="font-family:-apple-system,sans-serif;font-size:14px;line-height:1.6;color:${COLOR_FG};opacity:0.7;margin:0 0 12px 0;">${greeting}</p>
        <p style="font-family:Georgia,serif;font-size:28px;line-height:1.2;color:${COLOR_FG};margin:0 0 12px 0;letter-spacing:-0.02em;">${headline}</p>
        <div style="font-family:-apple-system,sans-serif;font-size:15px;line-height:1.6;color:${COLOR_FG};opacity:0.85;margin:0 0 32px 0;">${bodyHtml}</div>
        <table cellpadding="0" cellspacing="0" style="margin:0 0 32px 0;"><tr><td style="background-color:${COLOR_FG};border-radius:9999px;">
          <a href="${ctaHref}" style="display:inline-block;padding:14px 28px;font-family:-apple-system,sans-serif;font-size:14px;font-weight:600;color:${COLOR_BG};text-decoration:none;letter-spacing:-0.01em;">${ctaLabel}</a>
        </td></tr></table>
        <p style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:${COLOR_FG};opacity:0.55;font-style:italic;margin:0;letter-spacing:-0.01em;">That's all.</p>
      </td></tr>
    </table></td></tr>
  </table>
</body></html>`;
}

export async function sendApprovalNotification(params: NotifyParams): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const recipients = await resolveRecipients(params.collectionPlanId, params.triggeredBy);
  if (recipients.length === 0) return;

  const { data: sku } = await supabaseAdmin
    .from('collection_skus')
    .select('name')
    .eq('id', params.skuId)
    .maybeSingle();
  const skuName = sku?.name ?? 'SKU';
  const triggeredBy = params.triggeredByName ?? 'A team member';
  const ctaHref = `https://www.aimily.app/collection/${params.collectionPlanId}/techpack/${params.skuId}`;

  let headline: string;
  let body: string;
  let ctaLabel: string;
  if (params.stage === 'approved') {
    headline = `${skuName} is approved.`;
    body = `<strong>${triggeredBy}</strong> just approved <strong>${params.version}</strong> of <em>${skuName}</em>. The tech pack is now production-ready.${
      params.notes ? `<br/><br/><span style="opacity:0.7;font-style:italic;">"${params.notes}"</span>` : ''
    }`;
    ctaLabel = 'Open the tech pack →';
  } else if (params.stage === 'rejected') {
    headline = `${skuName} needs revisions.`;
    body = `<strong>${triggeredBy}</strong> rejected <strong>${params.version}</strong> of <em>${skuName}</em>.${
      params.notes ? `<br/><br/><strong>Reason:</strong> ${params.notes}` : ''
    }`;
    ctaLabel = 'Open the tech pack →';
  } else {
    headline = `${skuName} is awaiting ${STAGE_LABEL[params.stage]}.`;
    body = `<strong>${triggeredBy}</strong> moved <strong>${params.version}</strong> of <em>${skuName}</em> to <strong>${STAGE_LABEL[params.stage]}</strong>. Please review and approve or reject.${
      params.notes ? `<br/><br/><span style="opacity:0.7;font-style:italic;">"${params.notes}"</span>` : ''
    }`;
    ctaLabel = `Review ${STAGE_LABEL[params.stage]} →`;
  }

  const subject =
    params.stage === 'approved'
      ? `${skuName} approved (${params.version})`
      : params.stage === 'rejected'
        ? `${skuName} rejected — revisions needed`
        : `${skuName} → ${STAGE_LABEL[params.stage]}`;

  for (const rcpt of recipients) {
    const greeting = rcpt.name ? `Hi ${rcpt.name.split(' ')[0]},` : 'Hi there,';
    const html = shell({ greeting, headline, bodyHtml: body, ctaLabel, ctaHref });
    try {
      await resend.emails.send({
        from: FROM,
        to: rcpt.email,
        replyTo: REPLY_TO,
        subject,
        html,
      });
    } catch (err) {
      console.error('[approval-email] send failed for', rcpt.email, err);
    }
  }
}
