/**
 * Marketing Story Mode — post-launch retrospective email.
 *
 * Called from the post-launch cron after the analysis has been generated
 * and persisted. Builds a focused PPTX deck (cover + retrospective slide)
 * and emails it to the collection owner via Resend.
 *
 * Soft-fails: a missing RESEND_API_KEY, missing owner email, or Resend
 * error never blocks the analysis pipeline. The retrospective is still
 * accessible in-app via the LaunchCard regardless of email delivery.
 */

import { Resend } from 'resend';
import PptxGenJS from 'pptxgenjs';
import { supabaseAdmin } from './supabase-admin';
import {
  getMarketingPresentationData,
  getMarketingSlideVisibility,
} from './presentation-data';
import { addMarketingStorySlides } from './presentation-pptx-slides';
import { logAudit, AUDIT_ACTIONS } from './audit-log';

const CARBON = '282A29';
const CREMA = 'F5F1E8';
const GOLD = '9c7c4c';

interface PlanMeta {
  id: string;
  user_id: string;
  name: string | null;
  season: string | null;
  launch_date: string | null;
}

/**
 * Build a focused retrospective .pptx buffer (cover + retrospective slide).
 * Returns null when the plan has no retrospective data available.
 */
export async function buildRetrospectiveDeck(
  planMeta: PlanMeta
): Promise<{ buffer: Buffer; filename: string; sectionsRendered: string[] } | null> {
  const marketing = await getMarketingPresentationData(planMeta.id, planMeta.user_id);
  if (!marketing || !marketing.postLaunchAnalysis) return null;

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'aimily';
  pptx.title = `${planMeta.name ?? 'Collection'} — Retrospective`;

  // ── Cover slide ──
  const cover = pptx.addSlide();
  cover.background = { color: CARBON };
  cover.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.02, fill: { color: GOLD } });

  if (planMeta.season) {
    cover.addText(planMeta.season, {
      x: 1,
      y: 1.8,
      w: 11,
      h: 0.4,
      fontSize: 10,
      fontFace: 'Helvetica Neue',
      color: GOLD,
      charSpacing: 3,
      isTextBox: true,
    });
  }

  cover.addText(planMeta.name ?? 'Collection', {
    x: 1,
    y: 2.3,
    w: 11,
    h: 1.3,
    fontSize: 44,
    fontFace: 'Helvetica Neue',
    color: CREMA,
    isTextBox: true,
  });

  cover.addText('RETROSPECTIVE', {
    x: 1,
    y: 3.7,
    w: 11,
    h: 0.5,
    fontSize: 14,
    fontFace: 'Helvetica Neue',
    color: CREMA,
    charSpacing: 4,
    isTextBox: true,
  });

  cover.addShape(pptx.ShapeType.rect, { x: 1, y: 4.5, w: 1.2, h: 0.02, fill: { color: GOLD } });

  if (planMeta.launch_date) {
    cover.addText(
      `Launched ${new Date(planMeta.launch_date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })}`,
      {
        x: 1,
        y: 4.8,
        w: 11,
        h: 0.4,
        fontSize: 11,
        fontFace: 'Helvetica Neue',
        color: 'FAEFE060',
        isTextBox: true,
      }
    );
  }

  cover.addText('aimily', {
    x: 1,
    y: 6.8,
    w: 3,
    h: 0.3,
    fontSize: 10,
    fontFace: 'Helvetica Neue',
    color: 'FAEFE030',
    charSpacing: 2,
    isTextBox: true,
  });

  // ── Retrospective slide (only — other sections suppressed) ──
  const fullVisibility = getMarketingSlideVisibility(marketing);
  const result = addMarketingStorySlides(pptx, marketing, {
    brandVoice: false,
    stories: false,
    pillars: false,
    lookbook: false,
    drops: false,
    contentCalendar: false,
    paidGrowth: false,
    launchReadiness: false,
    emailSequences: false,
    retrospective: fullVisibility.retrospective,
  });

  // Build the buffer
  const base64 = (await pptx.write({ outputType: 'base64' })) as string;
  const buffer = Buffer.from(base64, 'base64');

  const safeName = (planMeta.name ?? 'Collection')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, '_');
  const filename = `${safeName}_Retrospective.pptx`;

  return { buffer, filename, sectionsRendered: result.sectionsRendered };
}

/**
 * Fetch the collection owner's email via the admin auth API. Returns null
 * when the user has no email or the lookup fails — caller should skip
 * delivery and audit a "skipped" event.
 */
async function getOwnerEmail(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !data?.user?.email) return null;
    return data.user.email;
  } catch {
    return null;
  }
}

/**
 * Send the retrospective deck to the collection owner.
 *
 * Returns `true` on successful send, `false` on any soft-failure
 * (missing RESEND_API_KEY, missing owner email, Resend error).
 * Never throws — the cron is the caller and analysis success must
 * remain decoupled from email delivery.
 */
export async function sendRetrospectiveEmail(planMeta: PlanMeta): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[retrospective-email] RESEND_API_KEY not set — skipping email');
    return false;
  }

  const deck = await buildRetrospectiveDeck(planMeta);
  if (!deck) {
    console.warn('[retrospective-email] no retrospective data for plan', planMeta.id);
    return false;
  }

  const ownerEmail = await getOwnerEmail(planMeta.user_id);
  if (!ownerEmail) {
    console.warn('[retrospective-email] owner email not found for plan', planMeta.id);
    return false;
  }

  // Pull top 3 wins + top 3 areas for email body
  const marketing = await getMarketingPresentationData(planMeta.id, planMeta.user_id);
  const analysis = marketing?.postLaunchAnalysis?.result;
  const topWins = (analysis?.wins ?? []).slice(0, 3);
  const topAreas = (analysis?.areas_for_improvement ?? []).slice(0, 3);

  const brand = planMeta.name ?? 'your collection';
  const seasonLabel = planMeta.season ? `${planMeta.season} ` : '';
  const subject = `Your ${brand} ${seasonLabel}retrospective — wins, gaps, next moves`;

  const fromAddress = process.env.RESEND_FROM_ADDRESS ?? 'aimily <hello@aimily.app>';

  const winsHtml = topWins.length > 0
    ? `<h3 style="font-family: Helvetica, sans-serif; font-size: 13px; color: #9c7c4c; letter-spacing: 2px; text-transform: uppercase; margin: 24px 0 8px;">Top wins</h3>
       <ul style="font-family: Helvetica, sans-serif; font-size: 14px; color: #282A29; line-height: 1.6; padding-left: 18px;">
         ${topWins.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}
       </ul>`
    : '';

  const areasHtml = topAreas.length > 0
    ? `<h3 style="font-family: Helvetica, sans-serif; font-size: 13px; color: #9c7c4c; letter-spacing: 2px; text-transform: uppercase; margin: 24px 0 8px;">Areas to sharpen</h3>
       <ul style="font-family: Helvetica, sans-serif; font-size: 14px; color: #282A29; line-height: 1.6; padding-left: 18px;">
         ${topAreas.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}
       </ul>`
    : '';

  const html = `
<!doctype html>
<html>
  <body style="margin: 0; padding: 0; background: #F5F1E8;">
    <table cellpadding="0" cellspacing="0" width="100%" style="background: #F5F1E8;">
      <tr>
        <td align="center" style="padding: 48px 16px;">
          <table cellpadding="0" cellspacing="0" width="560" style="max-width: 560px; background: #ffffff; border: 1px solid rgba(40,42,41,0.08);">
            <tr>
              <td style="padding: 40px 40px 24px; font-family: Helvetica, sans-serif;">
                <p style="font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: #9c7c4c; margin: 0 0 16px;">aimily · retrospective</p>
                <h1 style="font-size: 26px; color: #282A29; font-weight: 300; margin: 0 0 12px; line-height: 1.15;">${escapeHtml(brand)} — how your launch played out</h1>
                <p style="font-size: 14px; color: rgba(40,42,41,0.65); line-height: 1.6; margin: 0;">
                  Your post-launch analysis is ready. The attached deck contains the full retrospective —
                  wins, gaps, and the next moves to sharpen the next drop.
                </p>
                ${winsHtml}
                ${areasHtml}
                <p style="font-size: 12px; color: rgba(40,42,41,0.45); line-height: 1.6; margin: 32px 0 0;">
                  Open the attached <strong>${escapeHtml(deck.filename)}</strong> to review the full retrospective slide.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 40px 32px; font-family: Helvetica, sans-serif;">
                <div style="border-top: 1px solid rgba(40,42,41,0.08); padding-top: 16px;">
                  <p style="font-size: 10px; color: rgba(40,42,41,0.35); letter-spacing: 2px; text-transform: uppercase; margin: 0;">aimily · ai for fashion collection launches</p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;

  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from: fromAddress,
      to: ownerEmail,
      subject,
      html,
      attachments: [
        {
          filename: deck.filename,
          content: deck.buffer,
        },
      ],
    });

    void logAudit({
      userId: planMeta.user_id,
      collectionPlanId: planMeta.id,
      action: AUDIT_ACTIONS.MARKETING_RETROSPECTIVE_EMAILED,
      entityType: 'collection_plan',
      entityId: planMeta.id,
      metadata: {
        recipient: ownerEmail,
        filename: deck.filename,
        sections: deck.sectionsRendered,
      },
    });

    return true;
  } catch (err) {
    console.error('[retrospective-email] Resend send failed:', err);
    return false;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
