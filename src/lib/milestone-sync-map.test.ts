/**
 * Coverage test for the milestone sync map.
 *
 * Framework rule §10: every default milestone must have a sync entry.
 * If you add a milestone to DEFAULT_MILESTONES (timeline-template.ts)
 * without a corresponding entry in SYNC_MAP (milestone-sync-map.ts),
 * this test will fail and the calendar would silently leave the new
 * milestone in `pending` forever.
 *
 * To fix a failure: add the missing entry to SYNC_MAP with a predicate
 * that decides completed/in_progress from the SyncSnapshot.
 */
import { describe, it, expect } from 'vitest';
import { DEFAULT_MILESTONES } from './timeline-template';
import { SYNC_MAP, findCoverageGaps } from './milestone-sync-map';

describe('milestone-sync-map · coverage', () => {
  it('has a SYNC_MAP entry for every DEFAULT_MILESTONES id', () => {
    const gaps = findCoverageGaps();
    expect(
      gaps,
      `Coverage gap: ${gaps.length} milestone(s) defined in DEFAULT_MILESTONES have no SYNC_MAP entry. ` +
        `Add an entry in src/lib/milestone-sync-map.ts SYNC_MAP for: ${gaps.join(', ')}`,
    ).toEqual([]);
  });

  it('SYNC_MAP entry ids match their map keys', () => {
    for (const [key, entry] of Object.entries(SYNC_MAP)) {
      expect(entry.id, `SYNC_MAP["${key}"].id mismatched key`).toBe(key);
    }
  });

  it('every SYNC_MAP entry corresponds to a default milestone (no orphans)', () => {
    const defaultIds = new Set(DEFAULT_MILESTONES.map(m => m.id));
    const orphans = Object.keys(SYNC_MAP).filter(id => !defaultIds.has(id));
    expect(
      orphans,
      `Orphan SYNC_MAP entries (no longer in DEFAULT_MILESTONES): ${orphans.join(', ')}`,
    ).toEqual([]);
  });
});
