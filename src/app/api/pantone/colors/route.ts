/**
 * GET /api/pantone/colors
 *
 * Returns the full Pantone catalog from BD (2,317 entries). Used by
 * the <PantonePicker> on mount; falls back to the bundled TS catalog
 * if the fetch fails. Cached for 24h since the catalog rarely changes.
 */

import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return authError;
  void user;

  // Supabase caps select at 1,000 rows by default — paginate to grab
  // the full 2,317 catalog. Three pages cover us; the loop is generic
  // so it'll keep working if the catalog grows.
  interface PantoneRow {
    code: string;
    name: string;
    series: string;
    family: string;
    hex: string;
    rgb_r: number;
    rgb_g: number;
    rgb_b: number;
    lab_l: number;
    lab_a: number;
    lab_b: number;
  }
  const PAGE = 1000;
  const data: PantoneRow[] = [];
  let from = 0;
  for (;;) {
    const { data: page, error } = await supabaseAdmin
      .from('pantone_colors')
      .select('code, name, series, family, hex, rgb_r, rgb_g, rgb_b, lab_l, lab_a, lab_b')
      .order('code', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!page || page.length === 0) break;
    data.push(...(page as PantoneRow[]));
    if (page.length < PAGE) break;
    from += PAGE;
  }

  // Normalise the BD-side 18-family taxonomy back into the picker's
  // 12-family enum (red / pink / orange / yellow / green / blue /
  // purple / brown / neutral / white / black / metallic).
  const familyMap: Record<string, string> = {
    Red: 'red',
    Pink: 'pink',
    Orange: 'orange',
    Yellow: 'yellow',
    'Yellow-Green': 'green',
    Green: 'green',
    Teal: 'blue',
    Blue: 'blue',
    Purple: 'purple',
    Brown: 'brown',
    Neutral: 'neutral',
    Gray: 'neutral',
    White: 'white',
    Black: 'black',
    Metallic: 'metallic',
  };
  // Brown override: brownish names (lab a > 0, b > 0, mid-low L) are
  // labelled 'Red' or 'Orange' by the hue-angle classifier. Detect via
  // name keywords as a fallback so the Brown family in the picker isn't
  // empty.
  const BROWN_KEYS = ['brown', 'tobacco', 'tan', 'sepia', 'rust', 'cocoa', 'caramel', 'chocolate', 'mocha', 'walnut', 'chestnut', 'mahogany', 'coffee'];
  const colors = (data ?? []).map((r) => {
    const lcName = r.name.toLowerCase();
    const looksBrown = BROWN_KEYS.some((k) => lcName.includes(k));
    const family = looksBrown ? 'brown' : familyMap[r.family] ?? r.family.toLowerCase();
    return {
      code: r.code,
      name: r.name,
      series: r.series,
      family,
      hex: r.hex,
      rgb: { r: r.rgb_r, g: r.rgb_g, b: r.rgb_b },
      lab: { l: Number(r.lab_l), a: Number(r.lab_a), b: Number(r.lab_b) },
    };
  });

  return NextResponse.json(
    { colors },
    { headers: { 'Cache-Control': 'private, max-age=86400, stale-while-revalidate=86400' } },
  );
}
