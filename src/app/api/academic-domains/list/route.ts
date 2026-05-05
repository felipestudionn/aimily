import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Public — returns the list of supported academic institutions for the
 * Student tier, grouped by country. Used by the public /student page.
 *
 * One row per (country, school_name) — multiple email domains for the
 * same school are collapsed.
 *
 * Cached 1h: the whitelist barely changes.
 */
export const revalidate = 3600;

interface School {
  name: string;
  short_name: string | null;
  country: string;
  city: string | null;
  website: string | null;
  domains: string[];
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('academic_domains')
      .select('school_name, short_name, country, city, website, domain')
      .eq('active', true)
      .order('country')
      .order('school_name');

    if (error || !data) {
      return NextResponse.json({ schools: [], total: 0 });
    }

    // Collapse rows by (country, school_name) — one school can have N domains.
    const grouped = new Map<string, School>();
    for (const row of data) {
      const key = `${row.country}::${row.school_name}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.domains.push(row.domain);
      } else {
        grouped.set(key, {
          name: row.school_name,
          short_name: row.short_name,
          country: row.country,
          city: row.city,
          website: row.website,
          domains: [row.domain],
        });
      }
    }

    const schools = Array.from(grouped.values());
    return NextResponse.json({
      schools,
      total: schools.length,
      total_domains: data.length,
    });
  } catch (err) {
    console.error('academic-domains/list error:', err);
    return NextResponse.json({ schools: [], total: 0 });
  }
}
