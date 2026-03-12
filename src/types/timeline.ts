/** The 4 calendar blocks (teams) that group milestones in the Gantt chart */
export type TimelinePhase =
  | 'creative'      // Creative & Brand — equipo creativo
  | 'planning'      // Range Planning & Strategy — merchandising/planners
  | 'development'   // Design & Development — equipo técnico (design, proto, sampling, production)
  | 'go_to_market'; // Marketing & Digital — equipo marketing (digital, marketing, launch)

export type MilestoneStatus = 'pending' | 'in-progress' | 'completed';
export type Responsible = 'US' | 'FACTORY' | 'ALL' | 'AGENCY/US';

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
