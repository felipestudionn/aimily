/**
 * Image utility functions: color mapping, base64 conversion, contrast calculation.
 * Extracted from creative-space-client.tsx for reuse across Creative Space and Creative Brief.
 */

// Professional Pantone TCX Fashion Color Mapping
const COLOR_MAP: Record<string, string> = {
  // === WHITES & OFF-WHITES ===
  'white': '#FFFFFF', 'bright white': '#F4F5F0', 'snow white': '#F2F0EB',
  'cloud dancer': '#F0EEE4', 'whisper white': '#EDE6DB', 'marshmallow': '#F0E6D8',
  'gardenia': '#F1E8DA', 'pristine': '#E8DFD0', 'antique white': '#E8DCC8',
  'winter white': '#E4DACD', 'cream': '#F5E6C8', 'ivory': '#F2E8D5',
  'off-white': '#FAF6F0', 'off white': '#FAF6F0', 'egret': '#F3EEE4',
  'blanc de blanc': '#E8E4DA', 'vanilla ice': '#F0E4D4', 'papyrus': '#EDE4D0',

  // === BEIGES & NEUTRALS ===
  'beige': '#C8B88A', 'warm beige': '#C4A77D', 'sand': '#C2B280',
  'sandstone': '#786D5F', 'pebble': '#B5A999', 'stone': '#928E85',
  'taupe': '#8B7355', 'warm taupe': '#9F8170', 'silver mink': '#9E9085',
  'fungi': '#8F8681', 'dune': '#CFC1A7', 'safari': '#B5A084',
  'nomad': '#B4A68E', 'pale khaki': '#C3B091', 'twill': '#B8A88A',
  'sesame': '#D2B48C', 'tan': '#C19A6B', 'camel': '#C19A6B',
  'caramel': '#A67B5B', 'toffee': '#755139', 'tobacco brown': '#6F4E37',

  // === BROWNS ===
  'brown': '#6B4423', 'chocolate': '#3D1C02', 'chocolate brown': '#3D1C02',
  'espresso': '#3C2415', 'coffee': '#6F4E37', 'mocha': '#967969',
  'cognac': '#9A463D', 'chestnut': '#954535', 'mahogany': '#4C2C17',
  'walnut': '#5D432C', 'cinnamon': '#D27D46', 'ginger': '#B06500',
  'rust': '#B7410E', 'burnt orange': '#CC5500', 'terracotta': '#C04000',
  'sienna': '#A0522D', 'burnt sienna': '#E97451', 'copper': '#B87333',
  'bronze': '#CD7F32', 'amber': '#FFBF00', 'honey': '#EB9605',
  'butterscotch': '#E09540', 'ochre': '#CC7722', 'mustard': '#FFDB58',
  'golden brown': '#996515', 'buckhorn brown': '#8B6914',

  // === REDS ===
  'red': '#BE0032', 'true red': '#BF1932', 'fiery red': '#D01C1F',
  'scarlet': '#FF2400', 'cherry': '#DE3163', 'crimson': '#DC143C',
  'ruby': '#9B111E', 'garnet': '#733635', 'blood red': '#660000',
  'cardinal': '#C41E3A', 'poppy red': '#E35335', 'flame': '#E25822',
  'tomato': '#FF6347', 'vermillion': '#E34234', 'cinnabar': '#E44D2E',
  'coral': '#FF7F50', 'salmon': '#FA8072', 'peach': '#FFCBA4',
  'apricot': '#FBCEB1', 'melon': '#FEBAAD', 'cantaloupe': '#FFA62F',

  // === PINKS ===
  'pink': '#FFC0CB', 'hot pink': '#FF69B4', 'fuchsia': '#FF00FF',
  'magenta': '#FF0090', 'cerise': '#DE3163', 'raspberry': '#E30B5C',
  'rose': '#FF007F', 'dusty rose': '#DCAE96', 'dusty pink': '#D4A5A5',
  'blush': '#DE5D83', 'blush pink': '#FEC5E5', 'powder pink': '#FFB6C1',
  'ballet slipper': '#F5D7DC', 'peony': '#DE6FA1', 'orchid pink': '#F2BDCD',
  'mauve': '#E0B0FF', 'lilac': '#C8A2C8', 'lavender pink': '#FBAED2',
  'bubblegum': '#FFC1CC', 'candy pink': '#E4717A', 'flamingo': '#FC8EAC',

  // === ORANGES ===
  'orange': '#FF6600', 'tangerine': '#FF9966', 'mandarin': '#F37A48',
  'persimmon': '#EC5800', 'pumpkin': '#FF7518', 'carrot': '#ED9121',
  'papaya': '#FFEFD5', 'mango': '#FF8243', 'sunset orange': '#FD5E53',
  'rust orange': '#C45D3B', 'spice': '#6A442E',
  'cayenne': '#8D0226', 'paprika': '#8B2500', 'cinnamon stick': '#9C4722',

  // === YELLOWS ===
  'yellow': '#FFD700', 'bright yellow': '#FFFF00', 'lemon': '#FFF44F',
  'canary': '#FFEF00', 'sunshine': '#FFFD37', 'daffodil': '#FFFF31',
  'buttercup': '#F9E814', 'marigold': '#EAA221', 'gold': '#FFD700',
  'golden yellow': '#FFDF00', 'saffron': '#F4C430', 'turmeric': '#FFD54F',
  'curry': '#CABB48', 'chartreuse': '#DFFF00', 'lime': '#BFFF00',
  'sulfur': '#E8E050', 'primrose yellow': '#F6EB61', 'illuminating': '#F5DF4D',

  // === GREENS ===
  'green': '#008000', 'kelly green': '#4CBB17', 'grass green': '#7CFC00',
  'lime green': '#32CD32', 'apple green': '#8DB600', 'leaf green': '#71AA34',
  'forest green': '#228B22', 'hunter green': '#355E3B', 'pine green': '#01796F',
  'evergreen': '#05472A', 'bottle green': '#006A4E', 'racing green': '#004225',
  'emerald': '#50C878', 'jade': '#00A86B', 'malachite': '#0BDA51',
  'mint': '#98FF98', 'mint green': '#98FF98', 'seafoam': '#93E9BE',
  'sage': '#9DC183', 'sage green': '#9DC183', 'olive': '#808000',
  'olive green': '#6B8E23', 'army green': '#4B5320', 'khaki': '#C3B091',
  'moss': '#8A9A5B', 'fern': '#4F7942', 'basil': '#5D8A66',
  'pistachio': '#93C572', 'celadon': '#ACE1AF', 'eucalyptus': '#44D7A8',
  'teal': '#008080', 'dark teal': '#014D4E', 'deep teal': '#003E3E',

  // === BLUES ===
  'blue': '#0000FF', 'true blue': '#0073CF', 'classic blue': '#0F4C81',
  'navy': '#000080', 'navy blue': '#403F6F', 'dark navy': '#1B1B3A',
  'midnight blue': '#191970', 'prussian blue': '#003153', 'marine': '#042E60',
  'cobalt': '#0047AB', 'cobalt blue': '#0047AB', 'royal blue': '#4169E1',
  'sapphire': '#0F52BA', 'azure': '#007FFF', 'cerulean': '#007BA7',
  'electric blue': '#0892D0', 'bright blue': '#0096FF', 'vivid blue': '#00BFFF',
  'sky blue': '#87CEEB', 'light blue': '#ADD8E6', 'baby blue': '#89CFF0',
  'powder blue': '#B0E0E6', 'ice blue': '#99FFFF', 'arctic blue': '#82EDFD',
  'steel blue': '#4682B4', 'slate blue': '#6A5ACD', 'denim': '#1560BD',
  'indigo': '#4B0082', 'ink blue': '#1A1B41', 'peacock blue': '#005F69',
  'petrol': '#005F6A', 'petroleum': '#253529', 'aegean': '#1F456E',
  'cornflower': '#6495ED', 'periwinkle': '#CCCCFF', 'hydrangea': '#7B68EE',
  'french blue': '#0072BB', 'delft blue': '#1F305E', 'dutch blue': '#1E3F66',
  'turquoise': '#40E0D0', 'aqua': '#00FFFF', 'cyan': '#00FFFF',
  'aquamarine': '#7FFFD4', 'caribbean': '#00CED1', 'lagoon': '#017987',

  // === PURPLES & VIOLETS ===
  'purple': '#800080', 'violet': '#8B00FF', 'grape': '#6F2DA8',
  'plum': '#8E4585', 'eggplant': '#614051', 'aubergine': '#3D0734',
  'amethyst': '#9966CC', 'orchid': '#DA70D6', 'wisteria': '#C9A0DC',
  'lavender': '#E6E6FA', 'heather': '#B7A9C4', 'thistle': '#D8BFD8',
  'iris': '#5A4FCF', 'hyacinth': '#7B68EE', 'crocus': '#BE93D4',
  'mulberry': '#C54B8C', 'boysenberry': '#873260', 'blackberry': '#4D0135',
  'wine': '#722F37', 'burgundy': '#800020', 'bordeaux': '#5C1F31',
  'maroon': '#800000', 'oxblood': '#4A0000', 'claret': '#7F1734',
  'merlot': '#730039', 'cabernet': '#4C0013', 'sangria': '#92000A',

  // === GRAYS ===
  'gray': '#808080', 'grey': '#808080', 'charcoal': '#36454F',
  'anthracite': '#293133', 'graphite': '#383838', 'slate': '#708090',
  'slate gray': '#708090', 'steel gray': '#71797E', 'gunmetal': '#2C3539',
  'ash': '#B2BEB5', 'silver': '#C0C0C0', 'platinum': '#E5E4E2',
  'pearl gray': '#C4C3C0', 'dove gray': '#6D6968', 'storm gray': '#717C89',
  'cement': '#8D8D8D', 'concrete': '#95A5A6', 'titanium': '#878681',
  'pewter': '#8E8E8E', 'nickel': '#727472', 'iron': '#48494B',
  'smoke': '#738276', 'fog': '#D7D0C0', 'mist': '#C4C4BC',

  // === BLACKS ===
  'black': '#000000', 'jet black': '#0A0A0A', 'onyx': '#0F0F0F',
  'obsidian': '#0B0B0B', 'raven': '#0D0D0D', 'ebony': '#555D50',
  'ink': '#1A1A1A', 'midnight': '#191970', 'caviar': '#292929',
};

/**
 * Look up a hex color value from a color name using Pantone TCX mapping.
 * Supports direct and fuzzy matching.
 */
export function getColorValue(colorName: string): string | null {
  const normalized = colorName.toLowerCase().trim();

  // Direct match
  if (COLOR_MAP[normalized]) {
    return COLOR_MAP[normalized];
  }

  // Fuzzy match — partial matches
  for (const [key, value] of Object.entries(COLOR_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  return null;
}

/**
 * Determine if text should be light or dark based on background color luminance.
 */
export function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Convert an image URL to base64 for AI analysis.
 * Handles blob: URLs (uploaded files) and http: URLs (Pinterest, external) via proxy.
 */
export async function imageToBase64(imageUrl: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    // Blob URLs (uploaded files) — direct fetch
    if (imageUrl.startsWith('blob:')) {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve({ base64, mimeType: blob.type || 'image/jpeg' });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    }

    // External URLs (Pinterest, etc.) — use server proxy to avoid CORS
    if (imageUrl.startsWith('http')) {
      const response = await fetch('/api/proxy-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });

      if (response.ok) {
        const data = await response.json();
        return { base64: data.base64, mimeType: data.mimeType };
      }
      return null;
    }

    return null;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
}

/**
 * Parse a color string from AI output: "Name (code) - description"
 * Returns { colorName, colorCode, colorDescription }
 */
export function parseColorString(color: string): {
  colorName: string;
  colorCode: string;
  colorDescription: string;
} {
  let colorName = color;
  let colorCode = '';
  let colorDescription = '';

  // Extract description after " - "
  if (color.includes(' - ')) {
    const [namePart, ...descParts] = color.split(' - ');
    colorName = namePart.trim();
    colorDescription = descParts.join(' - ').trim();
  }

  // Extract code from parentheses
  const codeMatch = colorName.match(/\(([^)]+)\)/);
  if (codeMatch) {
    colorCode = codeMatch[1];
    colorName = colorName.replace(/\s*\([^)]+\)/, '').trim();
  }

  return { colorName, colorCode, colorDescription };
}

/**
 * Parse a trend/item string: "Title: description" or "Title - description"
 */
export function parseTrendString(trend: string): {
  title: string;
  description: string;
} {
  let title = trend;
  let description = '';

  if (trend.includes(':')) {
    const [t, ...descParts] = trend.split(':');
    title = t.trim();
    description = descParts.join(':').trim();
  } else if (trend.includes(' - ')) {
    const [t, ...descParts] = trend.split(' - ');
    title = t.trim();
    description = descParts.join(' - ').trim();
  }

  return { title, description };
}
