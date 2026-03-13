#!/usr/bin/env node
/**
 * Aimily x DWP2 Meme Generator
 * Generates 10 Instagram-ready memes (1080x1080) using Puppeteer
 * Run: node scripts/meme-generator/generate-memes.mjs
 */

import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const IMAGES = path.join(ROOT, 'instagram-posts/pictures-memes');
const LOGO_WHITE = path.join(ROOT, 'public/images/aimily-logo-white.png');
const LOGO_BLACK = path.join(ROOT, 'public/images/aimily-logo-black.png');
const OUTPUT = path.join(ROOT, 'instagram-posts/generated-memes');

// Ensure output dir
fs.mkdirSync(OUTPUT, { recursive: true });

// Convert file path to base64 data URI
function toDataUri(filePath) {
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
  const data = fs.readFileSync(filePath);
  return `data:${mime};base64,${data.toString('base64')}`;
}

const logoWhiteUri = toDataUri(LOGO_WHITE);
const logoBlackUri = toDataUri(LOGO_BLACK);

// ─── MEME DEFINITIONS ──────────────────────────────────────────────
const memes = [
  {
    id: 'meme-01-emily-vs-aimily',
    type: 'split',
    leftImage: 'IMG_5222.JPG',  // Andy stressed
    rightImage: 'IMG_5225.JPG', // Andy professional at computer
    leftLabel: 'Emily, 2006',
    rightLabel: 'Aimily, 2026',
    topText: '',
    bottomText: 'The assistant evolved.',
    logo: 'white',
  },
  {
    id: 'meme-02-glow-up',
    type: 'split',
    leftImage: 'IMG_5222.JPG',  // Stressed at desk
    rightImage: 'IMG_5225.JPG', // Professional at desk
    leftLabel: 'Before Aimily',
    rightLabel: 'After Aimily',
    topText: 'Your collection management glow-up',
    bottomText: '',
    logo: 'white',
  },
  {
    id: 'meme-03-planning-at-2am',
    type: 'single',
    image: 'IMG_5225.JPG',  // Andy focused at computer
    topText: 'Planning a 200-SKU collection at 2am',
    bottomText: 'Aimily never sleeps. Neither do deadlines.',
    logo: 'white',
  },
  {
    id: 'meme-04-gtm-3-minutes',
    type: 'single',
    image: 'IMG_5226.JPG',  // Emily + Serena laughing
    topText: 'When Aimily generates your entire\ngo-to-market strategy in 3 minutes',
    bottomText: '',
    logo: 'white',
  },
  {
    id: 'meme-05-manually-vs-aimily',
    type: 'single',
    image: 'IMG_5227.JPG',  // Emily carrying stack of papers
    topText: '',
    bottomText: 'Emily doing manually what\nAimily does in seconds.',
    logo: 'white',
  },
  {
    id: 'meme-06-deadline-tomorrow',
    type: 'single',
    image: 'IMG_5228.JPG',  // Emily + Serena worried
    topText: 'The collection deadline is tomorrow',
    bottomText: '"By all means, move at a glacial pace.\nYou know how that thrills me."\n\nOr just use Aimily.',
    logo: 'white',
  },
  {
    id: 'meme-07-coordinating-skus',
    type: 'single',
    image: 'IMG_5229.JPG',  // Emily + Serena in closet
    topText: 'Coordinating 40 SKUs\nacross 5 channels',
    bottomText: 'One platform. That\'s all.',
    logo: 'white',
  },
  {
    id: 'meme-08-florals-groundbreaking',
    type: 'single',
    image: 'IMG_5230.JPG',  // Serena "excuse me" look
    topText: '"Florals for spring?\nGroundbreaking."',
    bottomText: 'AI-predicted trends for spring?\nActually groundbreaking.',
    logo: 'white',
  },
  {
    id: 'meme-09-miranda-needs-assistant',
    type: 'single',
    image: 'IMG_5231.JPG',  // Miranda + Andy in office
    topText: 'Miranda needed an assistant.',
    bottomText: 'You need Aimily.',
    logo: 'white',
  },
  {
    id: 'meme-10-you-plus-aimily',
    type: 'single',
    image: 'IMG_5234.JPG',  // Andy + Emily in hallway
    topText: 'Andy had Emily.',
    bottomText: 'You have Aimily.\n\nFrom idea to runway. That\'s all.',
    logo: 'white',
  },
];

// ─── HTML TEMPLATES ─────────────────────────────────────────────────

function singleMemeHTML(meme) {
  const imgUri = toDataUri(path.join(IMAGES, meme.image));
  const logoUri = meme.logo === 'white' ? logoWhiteUri : logoBlackUri;

  return `<!DOCTYPE html>
<html><head><style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1080px; overflow: hidden; font-family: 'Inter', sans-serif; }
  .container {
    width: 1080px; height: 1080px;
    position: relative;
    background: #000;
  }
  .bg-image {
    width: 100%; height: 100%;
    object-fit: cover;
    object-position: center top;
    filter: brightness(0.55) contrast(1.1);
  }
  .overlay {
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(
      to bottom,
      rgba(0,0,0,0.7) 0%,
      rgba(0,0,0,0.05) 35%,
      rgba(0,0,0,0.05) 55%,
      rgba(0,0,0,0.75) 100%
    );
  }
  .top-text {
    position: absolute; top: 60px; left: 60px; right: 60px;
    color: #FAEFE0;
    font-size: 42px;
    font-weight: 300;
    letter-spacing: -0.02em;
    line-height: 1.2;
    white-space: pre-line;
    text-shadow: 0 2px 20px rgba(0,0,0,0.5);
  }
  .bottom-text {
    position: absolute; bottom: 100px; left: 60px; right: 60px;
    color: #FAEFE0;
    font-size: 36px;
    font-weight: 300;
    letter-spacing: -0.01em;
    line-height: 1.3;
    white-space: pre-line;
    text-shadow: 0 2px 20px rgba(0,0,0,0.5);
  }
  .logo {
    position: absolute; bottom: 40px; right: 60px;
    height: 28px;
    opacity: 0.85;
  }
  .url {
    position: absolute; bottom: 44px; left: 60px;
    color: #FAEFE0;
    font-size: 16px;
    font-weight: 400;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    opacity: 0.6;
  }
</style></head>
<body>
  <div class="container">
    <img class="bg-image" src="${imgUri}" />
    <div class="overlay"></div>
    ${meme.topText ? `<div class="top-text">${meme.topText}</div>` : ''}
    ${meme.bottomText ? `<div class="bottom-text">${meme.bottomText}</div>` : ''}
    <div class="url">aimily.app</div>
    <img class="logo" src="${logoUri}" />
  </div>
</body></html>`;
}

function splitMemeHTML(meme) {
  const leftUri = toDataUri(path.join(IMAGES, meme.leftImage));
  const rightUri = toDataUri(path.join(IMAGES, meme.rightImage));
  const logoUri = meme.logo === 'white' ? logoWhiteUri : logoBlackUri;

  return `<!DOCTYPE html>
<html><head><style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1080px; overflow: hidden; font-family: 'Inter', sans-serif; }
  .container {
    width: 1080px; height: 1080px;
    position: relative;
    display: flex;
    background: #000;
  }
  .half {
    width: 540px; height: 1080px;
    position: relative;
    overflow: hidden;
  }
  .half img {
    width: 100%; height: 100%;
    object-fit: cover;
    object-position: center center;
  }
  .left img { filter: brightness(0.45) contrast(1.05) saturate(0.3); }
  .right img { filter: brightness(0.55) contrast(1.1); }
  .half-overlay {
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0.6) 100%);
  }
  .divider {
    position: absolute;
    top: 0; bottom: 0;
    left: 539px;
    width: 2px;
    background: rgba(250,239,224,0.3);
    z-index: 10;
  }
  .label {
    position: absolute;
    bottom: 100px;
    color: #FAEFE0;
    font-size: 32px;
    font-weight: 300;
    letter-spacing: -0.01em;
    text-shadow: 0 2px 16px rgba(0,0,0,0.6);
    z-index: 5;
  }
  .label-left { left: 60px; }
  .label-right { right: 60px; text-align: right; }
  .top-text {
    position: absolute; top: 50px; left: 60px; right: 60px;
    color: #FAEFE0;
    font-size: 40px;
    font-weight: 300;
    letter-spacing: -0.02em;
    line-height: 1.2;
    text-align: center;
    text-shadow: 0 2px 20px rgba(0,0,0,0.6);
    z-index: 10;
  }
  .bottom-center {
    position: absolute; bottom: 45px; left: 0; right: 0;
    text-align: center;
    z-index: 10;
  }
  .bottom-center span {
    color: #FAEFE0;
    font-size: 22px;
    font-weight: 400;
    letter-spacing: 0.08em;
    text-shadow: 0 2px 16px rgba(0,0,0,0.6);
  }
  .vs {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    color: #FAEFE0;
    font-size: 28px;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    z-index: 10;
    text-shadow: 0 2px 16px rgba(0,0,0,0.6);
    background: rgba(0,0,0,0.4);
    padding: 8px 20px;
  }
  .logo {
    position: absolute; bottom: 44px; right: 60px;
    height: 24px;
    opacity: 0.85;
    z-index: 10;
  }
  .url {
    position: absolute; bottom: 48px; left: 60px;
    color: #FAEFE0;
    font-size: 14px;
    font-weight: 400;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    opacity: 0.5;
    z-index: 10;
  }
</style></head>
<body>
  <div class="container">
    <div class="half left">
      <img src="${leftUri}" />
      <div class="half-overlay"></div>
    </div>
    <div class="half right">
      <img src="${rightUri}" />
      <div class="half-overlay"></div>
    </div>
    <div class="divider"></div>
    <div class="vs">VS</div>
    ${meme.topText ? `<div class="top-text">${meme.topText}</div>` : ''}
    <div class="label label-left">${meme.leftLabel}</div>
    <div class="label label-right">${meme.rightLabel}</div>
    ${meme.bottomText ? `<div class="bottom-center"><span>${meme.bottomText}</span></div>` : ''}
    <div class="url">aimily.app</div>
    <img class="logo" src="${logoUri}" />
  </div>
</body></html>`;
}

// ─── GENERATOR ──────────────────────────────────────────────────────

async function main() {
  console.log('🎬 Aimily x DWP2 Meme Generator');
  console.log('================================\n');

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/Users/felipemartinez/.cache/puppeteer/chrome/mac_arm-146.0.7680.76/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const meme of memes) {
    console.log(`  Generating: ${meme.id}...`);

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 2 });

    const html = meme.type === 'split'
      ? splitMemeHTML(meme)
      : singleMemeHTML(meme);

    await page.setContent(html, { waitUntil: 'load', timeout: 60000 });

    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 500));

    const outputPath = path.join(OUTPUT, `${meme.id}.png`);
    await page.screenshot({
      path: outputPath,
      type: 'png',
      clip: { x: 0, y: 0, width: 1080, height: 1080 }
    });

    await page.close();
    console.log(`  ✓ Saved: ${outputPath}\n`);
  }

  await browser.close();
  console.log('================================');
  console.log(`✅ ${memes.length} memes generated in ${OUTPUT}`);
}

main().catch(console.error);
