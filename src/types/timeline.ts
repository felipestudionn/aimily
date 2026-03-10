export type TimelinePhase =
  | 'olawave'
  | 'brand'
  | 'design'
  | 'prototyping'
  | 'sampling'
  | 'digital'
  | 'marketing'
  | 'production'
  | 'launch';

export type MilestoneStatus = 'pending' | 'in-progress' | 'completed';
export type Responsible = 'US' | 'FACTORY' | 'ALL' | 'AGENCY' | 'DIGITAL';

export interface TimelineMilestone {
  id: string;
  phase: TimelinePhase;
  name: string;
  nameEs: string;
  responsible: Responsible;
  startWeeksBefore: number;
  durationWeeks: number;
  color: string;
  status: MilestoneStatus;
  notes?: string;
}

export interface PhaseInfo {
  id: TimelinePhase;
  name: string;
  nameEs: string;
  color: string;
  bgColor: string;
  icon: string;
}

export interface CollectionTimeline {
  id: string;
  collectionName: string;
  season: string;
  launchDate: string;
  milestones: TimelineMilestone[];
  createdAt: string;
  updatedAt: string;
}
