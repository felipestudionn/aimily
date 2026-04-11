/**
 * Marketing Story Mode — PPTX slide builders.
 *
 * Shared between:
 * - `/api/collection-export-pptx` (on-demand user export)
 * - `/api/cron/post-launch-analysis` (auto-emailed retrospective deck)
 *
 * Every slide is conditional on the underlying data being present, so a
 * sparse collection renders exactly the slides it has content for.
 *
 * Layout: assumes pptx.layout = 'LAYOUT_16x9' (13.333 × 7.5 inches).
 * Colors kept consistent with the web deck — Carbon / Crema / Gold.
 */

import type PptxGenJS from 'pptxgenjs';
import type {
  MarketingPresentationData,
  MarketingSlideVisibility,
  StoryWithHeroImage,
  CalendarWeek,
  EmailSequenceGroup,
  PaidCampaignGrouped,
  PresentationDrop,
  PresentationPostLaunchAnalysis,
  LaunchReadiness,
} from './presentation-data';
import type { LookbookPage } from '@/types/studio';
import type { BrandVoiceConfig, ContentPillar } from '@/types/digital';

// ── Design tokens (must match the export route) ──
const CARBON = '282A29';
const CREMA = 'F5F1E8';
const GOLD = '9c7c4c';
const CREMA_ALPHA_HIGH = 'FAEFE0';
const CREMA_ALPHA_MID = 'FAEFE060';
const CREMA_ALPHA_LOW = 'FAEFE030';
const CARBON_ALPHA_MID = '282A2990';
const CARBON_ALPHA_LOW = '282A2940';

function currency(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return d;
  }
}

/* ═════════════════════════════════════════════════════════════════
   Main builder — orchestrates all marketing slides in order
   ═════════════════════════════════════════════════════════════════ */

export interface AddMarketingSlidesResult {
  slidesAdded: number;
  sectionsRendered: string[];
}

export function addMarketingStorySlides(
  pptx: PptxGenJS,
  data: MarketingPresentationData,
  visibility: MarketingSlideVisibility
): AddMarketingSlidesResult {
  const rendered: string[] = [];
  let count = 0;

  if (visibility.brandVoice && data.brandVoice) {
    addBrandVoiceSlide(pptx, data.brandVoice);
    rendered.push('brand_voice');
    count += 1;
  }

  if (visibility.stories) {
    for (const story of data.stories.slice(0, 5)) {
      addStorySlide(pptx, story);
      count += 1;
    }
    rendered.push('stories');
  }

  if (visibility.pillars) {
    addPillarsSlide(pptx, data.pillars);
    rendered.push('pillars');
    count += 1;
  }

  if (visibility.lookbook) {
    for (const page of data.lookbookPages) {
      addLookbookSlide(pptx, page);
      count += 1;
    }
    rendered.push('lookbook');
  }

  if (visibility.drops) {
    addDropsSlide(pptx, data.drops, data.commercialActions);
    rendered.push('drops');
    count += 1;
  }

  if (visibility.contentCalendar) {
    for (let i = 0; i < data.contentCalendarWeeks.length; i += 1) {
      addCalendarSlide(pptx, data.contentCalendarWeeks[i], i + 1);
      count += 1;
    }
    rendered.push('content_calendar');
  }

  if (visibility.paidGrowth) {
    addPaidGrowthSlide(pptx, data.paidCampaigns);
    rendered.push('paid_growth');
    count += 1;
  }

  if (visibility.launchReadiness && data.launchReadiness) {
    addLaunchReadinessSlide(pptx, data.launchReadiness);
    rendered.push('launch_readiness');
    count += 1;
  }

  if (visibility.emailSequences) {
    addEmailSequencesSlide(pptx, data.emailSequences);
    rendered.push('email_sequences');
    count += 1;
  }

  if (visibility.retrospective && data.postLaunchAnalysis) {
    addRetrospectiveSlide(pptx, data.postLaunchAnalysis);
    rendered.push('retrospective');
    count += 1;
  }

  return { slidesAdded: count, sectionsRendered: rendered };
}

/* ═════════════════════════════════════════════════════════════════
   Individual slide builders
   ═════════════════════════════════════════════════════════════════ */

function addSectionHeading(slide: PptxGenJS.Slide, label: string) {
  slide.addText(label.toUpperCase(), {
    x: 1,
    y: 0.6,
    w: 11,
    h: 0.3,
    fontSize: 9,
    fontFace: 'Helvetica Neue',
    color: GOLD,
    charSpacing: 3,
    isTextBox: true,
  });
}

function addBrandVoiceSlide(pptx: PptxGenJS, bv: BrandVoiceConfig) {
  const slide = pptx.addSlide();
  slide.background = { color: CARBON };
  addSectionHeading(slide, 'Brand Voice');

  if (bv.personality) {
    slide.addText(bv.personality, {
      x: 1,
      y: 1.3,
      w: 11,
      h: 1.2,
      fontSize: 28,
      fontFace: 'Helvetica Neue',
      color: CREMA,
      isTextBox: true,
    });
  }

  if (bv.tone) {
    slide.addText('TONE', {
      x: 1,
      y: 3,
      w: 5,
      h: 0.25,
      fontSize: 8,
      fontFace: 'Helvetica Neue',
      color: CREMA_ALPHA_LOW,
      charSpacing: 2,
      isTextBox: true,
    });
    slide.addText(bv.tone, {
      x: 1,
      y: 3.3,
      w: 5,
      h: 1.2,
      fontSize: 12,
      fontFace: 'Helvetica Neue',
      color: CREMA_ALPHA_MID,
      isTextBox: true,
    });
  }

  if (bv.example_caption) {
    slide.addText('EXAMPLE CAPTION', {
      x: 6.5,
      y: 3,
      w: 5.5,
      h: 0.25,
      fontSize: 8,
      fontFace: 'Helvetica Neue',
      color: CREMA_ALPHA_LOW,
      charSpacing: 2,
      isTextBox: true,
    });
    slide.addText(`"${bv.example_caption}"`, {
      x: 6.5,
      y: 3.3,
      w: 5.5,
      h: 1.5,
      fontSize: 11,
      fontFace: 'Helvetica Neue',
      color: CREMA_ALPHA_MID,
      italic: true,
      isTextBox: true,
    });
  }

  const doRules = bv.do_rules ?? [];
  const dontRules = bv.dont_rules ?? [];
  if (doRules.length > 0) {
    slide.addText('DO', {
      x: 1,
      y: 5,
      w: 5,
      h: 0.25,
      fontSize: 8,
      fontFace: 'Helvetica Neue',
      color: CREMA_ALPHA_LOW,
      charSpacing: 2,
      isTextBox: true,
    });
    slide.addText(doRules.map((r) => `+  ${r}`).join('\n'), {
      x: 1,
      y: 5.3,
      w: 5,
      h: 1.8,
      fontSize: 10,
      fontFace: 'Helvetica Neue',
      color: CREMA_ALPHA_MID,
      isTextBox: true,
      paraSpaceAfter: 4,
    });
  }
  if (dontRules.length > 0) {
    slide.addText("DON'T", {
      x: 6.5,
      y: 5,
      w: 5.5,
      h: 0.25,
      fontSize: 8,
      fontFace: 'Helvetica Neue',
      color: CREMA_ALPHA_LOW,
      charSpacing: 2,
      isTextBox: true,
    });
    slide.addText(dontRules.map((r) => `—  ${r}`).join('\n'), {
      x: 6.5,
      y: 5.3,
      w: 5.5,
      h: 1.8,
      fontSize: 10,
      fontFace: 'Helvetica Neue',
      color: CREMA_ALPHA_MID,
      isTextBox: true,
      paraSpaceAfter: 4,
    });
  }
}

function addStorySlide(pptx: PptxGenJS, story: StoryWithHeroImage) {
  const slide = pptx.addSlide();
  slide.background = { color: CARBON };
  addSectionHeading(slide, 'Story');

  // Left: hero image
  if (story.heroImageUrl) {
    try {
      slide.addImage({
        path: story.heroImageUrl,
        x: 0,
        y: 0,
        w: 6,
        h: 7.5,
        sizing: { type: 'cover', w: 6, h: 7.5 },
      });
    } catch {
      // ignore image errors — slide still renders
    }
  }

  // Right: narrative
  slide.addText(story.story.name, {
    x: 6.5,
    y: 1.3,
    w: 6.5,
    h: 1.4,
    fontSize: 32,
    fontFace: 'Helvetica Neue',
    color: CREMA,
    isTextBox: true,
  });

  if (story.story.editorial_hook) {
    slide.addText(`"${story.story.editorial_hook}"`, {
      x: 6.5,
      y: 2.8,
      w: 6.5,
      h: 1.2,
      fontSize: 14,
      fontFace: 'Helvetica Neue',
      color: CREMA_ALPHA_MID,
      italic: true,
      isTextBox: true,
    });
  }

  if (story.story.narrative) {
    slide.addText(story.story.narrative, {
      x: 6.5,
      y: 4.2,
      w: 6.5,
      h: 2.5,
      fontSize: 11,
      fontFace: 'Helvetica Neue',
      color: CREMA_ALPHA_MID,
      isTextBox: true,
      paraSpaceAfter: 4,
    });
  }

  if (story.heroSkuName) {
    slide.addText(`HERO · ${story.heroSkuName.toUpperCase()}`, {
      x: 6.5,
      y: 6.9,
      w: 6.5,
      h: 0.3,
      fontSize: 8,
      fontFace: 'Helvetica Neue',
      color: CREMA_ALPHA_LOW,
      charSpacing: 2,
      isTextBox: true,
    });
  }
}

function addPillarsSlide(pptx: PptxGenJS, pillars: ContentPillar[]) {
  const slide = pptx.addSlide();
  slide.background = { color: CREMA };
  addSectionHeading(slide, 'Content Pillars');

  const visible = pillars.slice(0, 6);
  visible.forEach((pillar, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 1 + col * 6;
    const y = 1.5 + row * 2;

    // Number
    slide.addText(String(i + 1).padStart(2, '0'), {
      x,
      y,
      w: 0.5,
      h: 0.3,
      fontSize: 8,
      fontFace: 'Helvetica Neue',
      color: GOLD,
      charSpacing: 2,
      isTextBox: true,
    });
    // Name
    slide.addText(pillar.name, {
      x: x + 0.5,
      y,
      w: 5,
      h: 0.5,
      fontSize: 16,
      fontFace: 'Helvetica Neue',
      color: CARBON,
      isTextBox: true,
    });
    // Description
    if (pillar.description) {
      slide.addText(pillar.description, {
        x: x + 0.5,
        y: y + 0.5,
        w: 5,
        h: 1,
        fontSize: 10,
        fontFace: 'Helvetica Neue',
        color: CARBON_ALPHA_MID,
        isTextBox: true,
        paraSpaceAfter: 2,
      });
    }
  });
}

function addLookbookSlide(pptx: PptxGenJS, page: LookbookPage) {
  const slide = pptx.addSlide();
  slide.background = { color: page.background_color ?? CARBON };

  const images = page.content.filter((c) => c.type === 'image' && c.asset_url);
  const texts = page.content.filter((c) => c.type === 'text' && c.text);

  const SLIDE_W = 13.333;
  const SLIDE_H = 7.5;

  const addImageSafe = (url: string, opts: { x: number; y: number; w: number; h: number }) => {
    try {
      slide.addImage({ path: url, ...opts, sizing: { type: 'cover', w: opts.w, h: opts.h } });
    } catch {
      // ignore — blank region still acceptable
    }
  };

  switch (page.layout_type) {
    case 'cover': {
      const hero = images[0]?.asset_url;
      const title = texts[0]?.text;
      if (hero) addImageSafe(hero, { x: 0, y: 0, w: SLIDE_W, h: SLIDE_H });
      if (title) {
        slide.addText(title, {
          x: 1,
          y: 3,
          w: SLIDE_W - 2,
          h: 1.5,
          fontSize: 44,
          fontFace: 'Helvetica Neue',
          color: CREMA,
          align: 'center',
          isTextBox: true,
        });
      }
      break;
    }
    case 'full_bleed': {
      const hero = images[0]?.asset_url;
      if (hero) addImageSafe(hero, { x: 0, y: 0, w: SLIDE_W, h: SLIDE_H });
      break;
    }
    case 'two_column': {
      const leftImage = images[0]?.asset_url;
      const rightText = texts[0]?.text;
      if (leftImage) addImageSafe(leftImage, { x: 0, y: 0, w: SLIDE_W / 2, h: SLIDE_H });
      if (rightText) {
        slide.addText(rightText, {
          x: SLIDE_W / 2 + 0.5,
          y: 2,
          w: SLIDE_W / 2 - 1,
          h: 3.5,
          fontSize: 16,
          fontFace: 'Helvetica Neue',
          color: CREMA,
          isTextBox: true,
          paraSpaceAfter: 4,
        });
      }
      break;
    }
    case 'grid_4': {
      const tileW = SLIDE_W / 2 - 0.1;
      const tileH = SLIDE_H / 2 - 0.1;
      for (let i = 0; i < 4; i += 1) {
        const img = images[i]?.asset_url;
        if (!img) continue;
        const col = i % 2;
        const row = Math.floor(i / 2);
        addImageSafe(img, {
          x: 0.05 + col * (tileW + 0.1),
          y: 0.05 + row * (tileH + 0.1),
          w: tileW,
          h: tileH,
        });
      }
      break;
    }
    case 'text_image': {
      const heroText = texts[0]?.text;
      const body = texts[1]?.text;
      const heroImage = images[0]?.asset_url;
      if (heroText) {
        slide.addText(heroText, {
          x: 1,
          y: 0.8,
          w: SLIDE_W - 2,
          h: 1,
          fontSize: 28,
          fontFace: 'Helvetica Neue',
          color: CREMA,
          isTextBox: true,
        });
      }
      if (body) {
        slide.addText(body, {
          x: 1,
          y: 2,
          w: SLIDE_W - 2,
          h: 1,
          fontSize: 11,
          fontFace: 'Helvetica Neue',
          color: CREMA_ALPHA_MID,
          isTextBox: true,
        });
      }
      if (heroImage) addImageSafe(heroImage, { x: 0, y: 3.2, w: SLIDE_W, h: SLIDE_H - 3.2 });
      break;
    }
    case 'quote': {
      const quote = texts[0]?.text;
      const attribution = texts[1]?.text;
      if (quote) {
        slide.addText(`"${quote}"`, {
          x: 1,
          y: 2.5,
          w: SLIDE_W - 2,
          h: 2.5,
          fontSize: 30,
          fontFace: 'Helvetica Neue',
          color: CREMA,
          align: 'center',
          isTextBox: true,
        });
      }
      if (attribution) {
        slide.addText(`— ${attribution}`, {
          x: 1,
          y: 5.5,
          w: SLIDE_W - 2,
          h: 0.5,
          fontSize: 11,
          fontFace: 'Helvetica Neue',
          color: CREMA_ALPHA_LOW,
          charSpacing: 2,
          align: 'center',
          isTextBox: true,
        });
      }
      break;
    }
    default: {
      const hero = images[0]?.asset_url;
      if (hero) addImageSafe(hero, { x: 0, y: 0, w: SLIDE_W, h: SLIDE_H });
    }
  }
}

function addDropsSlide(
  pptx: PptxGenJS,
  drops: PresentationDrop[],
  actions: Array<{ name: string; start_date: string | null }>
) {
  const slide = pptx.addSlide();
  slide.background = { color: CARBON };
  addSectionHeading(slide, 'Go-to-Market · Drops');

  drops.slice(0, 5).forEach((drop, i) => {
    const y = 1.5 + i * 1;
    slide.addText(String(drop.drop_number).padStart(2, '0'), {
      x: 1,
      y,
      w: 0.8,
      h: 0.5,
      fontSize: 22,
      fontFace: 'Helvetica Neue',
      color: CREMA,
      isTextBox: true,
    });
    slide.addText(drop.name, {
      x: 2,
      y,
      w: 7,
      h: 0.4,
      fontSize: 14,
      fontFace: 'Helvetica Neue',
      color: CREMA,
      isTextBox: true,
    });
    const meta: string[] = [];
    if (drop.launch_date) meta.push(`Launch ${formatDate(drop.launch_date)}`);
    if (drop.weeks_active) meta.push(`${drop.weeks_active}w active`);
    if (drop.channels && drop.channels.length > 0) meta.push(drop.channels.slice(0, 3).join(' · '));
    if (meta.length > 0) {
      slide.addText(meta.join('  ·  '), {
        x: 2,
        y: y + 0.35,
        w: 10,
        h: 0.3,
        fontSize: 9,
        fontFace: 'Helvetica Neue',
        color: CREMA_ALPHA_LOW,
        isTextBox: true,
      });
    }
    if (drop.story_description) {
      slide.addText(drop.story_description, {
        x: 2,
        y: y + 0.6,
        w: 10,
        h: 0.35,
        fontSize: 10,
        fontFace: 'Helvetica Neue',
        color: CREMA_ALPHA_MID,
        isTextBox: true,
      });
    }
  });

  if (actions.length > 0) {
    slide.addText('COMMERCIAL ACTIONS', {
      x: 1,
      y: 6.5,
      w: 11,
      h: 0.25,
      fontSize: 8,
      fontFace: 'Helvetica Neue',
      color: CREMA_ALPHA_LOW,
      charSpacing: 2,
      isTextBox: true,
    });
    slide.addText(
      actions
        .slice(0, 6)
        .map((a) => (a.start_date ? `${a.name} · ${formatDate(a.start_date)}` : a.name))
        .join('   ·   '),
      {
        x: 1,
        y: 6.8,
        w: 11,
        h: 0.5,
        fontSize: 9,
        fontFace: 'Helvetica Neue',
        color: CREMA_ALPHA_MID,
        isTextBox: true,
      }
    );
  }
}

function addCalendarSlide(pptx: PptxGenJS, week: CalendarWeek, weekIndex: number) {
  const slide = pptx.addSlide();
  slide.background = { color: CREMA };
  addSectionHeading(slide, `Content Calendar · Week ${weekIndex}`);

  slide.addText(week.weekLabel, {
    x: 1,
    y: 1.2,
    w: 8,
    h: 0.9,
    fontSize: 32,
    fontFace: 'Helvetica Neue',
    color: CARBON,
    isTextBox: true,
  });
  slide.addText(`${week.entries.length} post${week.entries.length !== 1 ? 's' : ''}`, {
    x: 1,
    y: 2.1,
    w: 8,
    h: 0.3,
    fontSize: 9,
    fontFace: 'Helvetica Neue',
    color: CARBON_ALPHA_LOW,
    charSpacing: 2,
    isTextBox: true,
  });

  week.entries.slice(0, 10).forEach((entry, i) => {
    const y = 2.7 + i * 0.42;
    const date = new Date(entry.scheduled_date).toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
    });
    slide.addText(date, {
      x: 1,
      y,
      w: 1.5,
      h: 0.3,
      fontSize: 9,
      fontFace: 'Helvetica Neue',
      color: CARBON_ALPHA_LOW,
      charSpacing: 1,
      isTextBox: true,
    });
    slide.addText(entry.platform ?? entry.content_type, {
      x: 2.5,
      y,
      w: 1.7,
      h: 0.3,
      fontSize: 8,
      fontFace: 'Helvetica Neue',
      color: CARBON_ALPHA_LOW,
      charSpacing: 1,
      isTextBox: true,
    });
    slide.addText(entry.title, {
      x: 4.3,
      y,
      w: 8,
      h: 0.3,
      fontSize: 10,
      fontFace: 'Helvetica Neue',
      color: CARBON,
      isTextBox: true,
    });
  });
}

function addPaidGrowthSlide(pptx: PptxGenJS, campaigns: PaidCampaignGrouped[]) {
  const slide = pptx.addSlide();
  slide.background = { color: CARBON };
  addSectionHeading(slide, 'Paid & Growth');

  const totalBudget = campaigns.reduce((sum, c) => sum + c.totalBudget, 0);

  slide.addText(String(campaigns.length), {
    x: 1,
    y: 1.2,
    w: 3,
    h: 1,
    fontSize: 48,
    fontFace: 'Helvetica Neue',
    color: CREMA,
    isTextBox: true,
  });
  slide.addText('CAMPAIGNS', {
    x: 1,
    y: 2.3,
    w: 3,
    h: 0.3,
    fontSize: 9,
    fontFace: 'Helvetica Neue',
    color: CREMA_ALPHA_LOW,
    charSpacing: 2,
    isTextBox: true,
  });

  slide.addText(currency(totalBudget), {
    x: 5,
    y: 1.2,
    w: 6,
    h: 1,
    fontSize: 48,
    fontFace: 'Helvetica Neue',
    color: CREMA,
    isTextBox: true,
  });
  slide.addText('TOTAL BUDGET', {
    x: 5,
    y: 2.3,
    w: 6,
    h: 0.3,
    fontSize: 9,
    fontFace: 'Helvetica Neue',
    color: CREMA_ALPHA_LOW,
    charSpacing: 2,
    isTextBox: true,
  });

  campaigns.slice(0, 6).forEach(({ campaign, totalBudget: budget, adSetCount }, i) => {
    const y = 3.3 + i * 0.6;
    slide.addText(campaign.name, {
      x: 1,
      y,
      w: 8,
      h: 0.3,
      fontSize: 12,
      fontFace: 'Helvetica Neue',
      color: CREMA,
      isTextBox: true,
    });
    const meta = [campaign.platform, campaign.objective, `${adSetCount} ad set${adSetCount !== 1 ? 's' : ''}`];
    slide.addText(meta.join(' · '), {
      x: 1,
      y: y + 0.3,
      w: 8,
      h: 0.25,
      fontSize: 8,
      fontFace: 'Helvetica Neue',
      color: CREMA_ALPHA_LOW,
      isTextBox: true,
    });
    slide.addText(currency(budget), {
      x: 9.5,
      y,
      w: 3,
      h: 0.4,
      fontSize: 14,
      fontFace: 'Helvetica Neue',
      color: CREMA,
      align: 'right',
      isTextBox: true,
    });
  });
}

function addLaunchReadinessSlide(pptx: PptxGenJS, readiness: LaunchReadiness) {
  const slide = pptx.addSlide();
  slide.background = { color: CREMA };
  addSectionHeading(slide, 'Launch Readiness');

  slide.addText(`${readiness.overallPct}%`, {
    x: 1,
    y: 1.1,
    w: 4,
    h: 1.4,
    fontSize: 72,
    fontFace: 'Helvetica Neue',
    color: CARBON,
    isTextBox: true,
  });
  slide.addText(`${readiness.completedTasks} / ${readiness.totalTasks} tasks`, {
    x: 1,
    y: 2.5,
    w: 4,
    h: 0.3,
    fontSize: 10,
    fontFace: 'Helvetica Neue',
    color: CARBON_ALPHA_LOW,
    charSpacing: 2,
    isTextBox: true,
  });

  readiness.categories.slice(0, 7).forEach((cat, i) => {
    const y = 3.3 + i * 0.5;
    const label = cat.category.replace(/_/g, ' ');
    slide.addText(label, {
      x: 1,
      y,
      w: 3,
      h: 0.3,
      fontSize: 10,
      fontFace: 'Helvetica Neue',
      color: CARBON,
      isTextBox: true,
    });
    slide.addText(`${cat.completed} / ${cat.total}`, {
      x: 4,
      y,
      w: 1.5,
      h: 0.3,
      fontSize: 9,
      fontFace: 'Helvetica Neue',
      color: CARBON_ALPHA_LOW,
      isTextBox: true,
    });
    // Bar background
    slide.addShape(pptx.ShapeType.rect, {
      x: 5.5,
      y: y + 0.05,
      w: 6,
      h: 0.25,
      fill: { color: '282A29', transparency: 90 },
      line: { color: 'FFFFFF', width: 0 },
    });
    // Bar fill
    const barW = Math.max((cat.pct / 100) * 6, 0.1);
    slide.addShape(pptx.ShapeType.rect, {
      x: 5.5,
      y: y + 0.05,
      w: barW,
      h: 0.25,
      fill: { color: GOLD, transparency: 40 },
      line: { color: 'FFFFFF', width: 0 },
    });
    slide.addText(`${cat.pct}%`, {
      x: 11.7,
      y,
      w: 0.8,
      h: 0.3,
      fontSize: 9,
      fontFace: 'Helvetica Neue',
      color: CARBON,
      align: 'right',
      isTextBox: true,
    });
  });
}

function addEmailSequencesSlide(pptx: PptxGenJS, sequences: EmailSequenceGroup[]) {
  const slide = pptx.addSlide();
  slide.background = { color: CARBON };
  addSectionHeading(slide, 'Email Sequences');

  let y = 1.2;
  sequences.slice(0, 3).forEach((group) => {
    slide.addText(group.sequenceName ?? 'Sequence', {
      x: 1,
      y,
      w: 8,
      h: 0.4,
      fontSize: 16,
      fontFace: 'Helvetica Neue',
      color: CREMA,
      isTextBox: true,
    });
    const meta: string[] = [];
    if (group.sequenceType) meta.push(group.sequenceType.replace(/_/g, ' ').toUpperCase());
    meta.push(`${group.emails.length} EMAILS`);
    slide.addText(meta.join('  ·  '), {
      x: 9,
      y: y + 0.05,
      w: 3.5,
      h: 0.35,
      fontSize: 8,
      fontFace: 'Helvetica Neue',
      color: GOLD,
      charSpacing: 2,
      align: 'right',
      isTextBox: true,
    });
    y += 0.55;

    group.emails.slice(0, 5).forEach((email, i) => {
      const delay =
        email.send_delay_hours !== null && email.send_delay_hours !== undefined
          ? ` · +${email.send_delay_hours}h`
          : '';
      slide.addText(`${String(i + 1).padStart(2, '0')}${delay}`, {
        x: 1.3,
        y,
        w: 1.5,
        h: 0.3,
        fontSize: 8,
        fontFace: 'Helvetica Neue',
        color: CREMA_ALPHA_LOW,
        charSpacing: 1,
        isTextBox: true,
      });
      if (email.subject_line) {
        slide.addText(email.subject_line, {
          x: 2.9,
          y,
          w: 9.3,
          h: 0.3,
          fontSize: 10,
          fontFace: 'Helvetica Neue',
          color: CREMA,
          isTextBox: true,
        });
      }
      y += 0.35;
    });
    y += 0.3;
  });
}

function addRetrospectiveSlide(pptx: PptxGenJS, analysis: PresentationPostLaunchAnalysis) {
  const slide = pptx.addSlide();
  slide.background = { color: CREMA };
  addSectionHeading(slide, 'Retrospective');

  const result = analysis.result;

  if (result.overall_assessment) {
    slide.addText(`"${result.overall_assessment}"`, {
      x: 1,
      y: 1.2,
      w: 11,
      h: 1.6,
      fontSize: 20,
      fontFace: 'Helvetica Neue',
      color: CARBON,
      italic: true,
      isTextBox: true,
    });
  }

  const columns: Array<{ label: string; items: string[]; marker: string; color: string }> = [];
  if (result.wins && result.wins.length > 0) {
    columns.push({ label: 'WINS', items: result.wins.slice(0, 5), marker: '+', color: GOLD });
  }
  if (result.areas_for_improvement && result.areas_for_improvement.length > 0) {
    columns.push({
      label: 'AREAS FOR IMPROVEMENT',
      items: result.areas_for_improvement.slice(0, 5),
      marker: '—',
      color: CARBON_ALPHA_LOW,
    });
  }
  if (result.recommendations && result.recommendations.length > 0) {
    columns.push({
      label: 'RECOMMENDATIONS',
      items: result.recommendations.slice(0, 5),
      marker: '→',
      color: GOLD,
    });
  }

  const colW = 11 / Math.max(columns.length, 1);
  columns.forEach((col, i) => {
    const x = 1 + i * colW;
    slide.addText(col.label, {
      x,
      y: 3.5,
      w: colW - 0.2,
      h: 0.25,
      fontSize: 8,
      fontFace: 'Helvetica Neue',
      color: CARBON_ALPHA_LOW,
      charSpacing: 2,
      isTextBox: true,
    });
    slide.addText(col.items.map((item) => `${col.marker}  ${item}`).join('\n'), {
      x,
      y: 3.85,
      w: colW - 0.2,
      h: 3.5,
      fontSize: 10,
      fontFace: 'Helvetica Neue',
      color: CARBON_ALPHA_MID,
      isTextBox: true,
      paraSpaceAfter: 6,
    });
  });
}

/* Re-export types consumers need without a circular import */
export type { MarketingPresentationData, MarketingSlideVisibility };
export { getMarketingPresentationData } from './presentation-data';
