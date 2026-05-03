import { describe, it, expect } from 'vitest';
import { nextVersion, diffRevisions, type RevisionRow } from './revisions';

describe('nextVersion — semver-ish bumping rule', () => {
  it('starts at v1.0 with no prior version', () => {
    expect(nextVersion(null, false)).toBe('v1.0');
    expect(nextVersion(null, true)).toBe('v1.0');
  });

  it('minor-bumps on regular saves', () => {
    expect(nextVersion('v1.0', false)).toBe('v1.1');
    expect(nextVersion('v1.5', false)).toBe('v1.6');
    expect(nextVersion('v3.12', false)).toBe('v3.13');
  });

  it('major-bumps on approval landing', () => {
    expect(nextVersion('v1.0', true)).toBe('v2.0');
    expect(nextVersion('v1.5', true)).toBe('v2.0');
    expect(nextVersion('v3.12', true)).toBe('v4.0');
  });

  it('falls back to v1.0 on unparseable input', () => {
    expect(nextVersion('garbage', false)).toBe('v1.0');
    expect(nextVersion('v', false)).toBe('v1.0');
    expect(nextVersion('1.2.3', false)).toBe('v1.0');
  });
});

const makeRev = (id: string, snapshot: Partial<RevisionRow> = {}): RevisionRow => ({
  id,
  collection_plan_id: 'col-1',
  sku_id: 'sku-1',
  parent_revision_id: null,
  version: 'v1.0',
  is_current: true,
  header_snapshot: {},
  drawings_snapshot: {},
  measurements_snapshot: {},
  bom_snapshot: {},
  materials_snapshot: {},
  grading_snapshot: {},
  factory_notes_snapshot: {},
  construction_details_snapshot: {},
  cost_breakdown_snapshot: {},
  comments_snapshot: [],
  approval_status: 'draft',
  approval_chain: [],
  created_by: 'u1',
  created_by_name: null,
  change_summary: null,
  created_at: '2026-01-01T00:00:00Z',
  ...snapshot,
});

describe('diffRevisions — section-level diff', () => {
  it('returns all sections as unchanged when both revisions are identical', () => {
    const a = makeRev('a');
    const b = makeRev('b');
    const sections = diffRevisions(a, b);
    expect(sections.every((s) => !s.changed)).toBe(true);
  });

  it('flags only the sections that differ', () => {
    const a = makeRev('a', { bom_snapshot: { lines: [{ material: 'cotton' }] } });
    const b = makeRev('b', { bom_snapshot: { lines: [{ material: 'linen' }] } });
    const sections = diffRevisions(a, b);
    const bom = sections.find((s) => s.section === 'bom');
    expect(bom?.changed).toBe(true);
    expect(bom?.changedPaths.length).toBeGreaterThan(0);
    // Other sections stay unchanged
    expect(sections.find((s) => s.section === 'measurements')?.changed).toBe(false);
  });

  it('reports leaf paths within the diffed section', () => {
    const a = makeRev('a', { header_snapshot: { title: 'Old', subtitle: 'Same' } });
    const b = makeRev('b', { header_snapshot: { title: 'New', subtitle: 'Same' } });
    const sections = diffRevisions(a, b);
    const header = sections.find((s) => s.section === 'header');
    expect(header?.changedPaths).toContain('title');
    expect(header?.changedPaths).not.toContain('subtitle');
  });

  it('treats add/remove of keys as changes', () => {
    const a = makeRev('a', { drawings_snapshot: { viewA: 'url-a' } });
    const b = makeRev('b', { drawings_snapshot: { viewA: 'url-a', viewC: 'url-c' } });
    const sections = diffRevisions(a, b);
    const drawings = sections.find((s) => s.section === 'drawings');
    expect(drawings?.changed).toBe(true);
    expect(drawings?.changedPaths).toContain('viewC');
  });
});
