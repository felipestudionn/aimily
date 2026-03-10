import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesDir = path.join(__dirname, '..', 'public', 'images');
const publicDir = path.join(__dirname, '..', 'public');

const CARBON = { r: 40, g: 42, b: 41 }; // #282A29
const CORNER_RADIUS = 112; // ~22% of 512 for iOS-style rounding

async function generateIcon(size, cornerRadius, outputPath) {
  // Scale the slash to ~45% of icon size
  const slashHeight = Math.round(size * 0.45);
  const slashResized = await sharp(path.join(imagesDir, 'PWA LOGO.png'))
    .resize({ height: slashHeight, fit: 'inside' })
    .toBuffer();

  const slashMeta = await sharp(slashResized).metadata();
  const slashWidth = slashMeta.width;

  // Center position
  const left = Math.round((size - slashWidth) / 2);
  const top = Math.round((size - slashHeight) / 2);

  // Create rounded rect mask
  const roundedMask = Buffer.from(
    `<svg width="${size}" height="${size}">
      <rect x="0" y="0" width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}" fill="white"/>
    </svg>`
  );

  // Create carbon background with rounded corners, composite slash on top
  const icon = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { ...CARBON, alpha: 255 },
    },
  })
    .composite([
      {
        input: roundedMask,
        blend: 'dest-in', // apply rounded mask
      },
      {
        input: slashResized,
        left,
        top,
      },
    ])
    .png()
    .toFile(outputPath);

  console.log(`Generated: ${outputPath} (${size}x${size})`);
}

// Generate PWA icons
await generateIcon(512, 112, path.join(imagesDir, 'aimily-pwa-512.png'));
await generateIcon(192, 42, path.join(imagesDir, 'aimily-pwa-192.png'));

// Generate favicon (32x32, small corner radius)
await generateIcon(32, 6, path.join(publicDir, 'favicon.png'));

// Also generate apple-touch-icon (180x180, no mask needed — iOS applies its own)
await generateIcon(180, 0, path.join(publicDir, 'apple-touch-icon.png'));

console.log('Done! All PWA icons generated.');
