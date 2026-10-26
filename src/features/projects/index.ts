/**
 * Builder-projects feature. Cross-feature imports come through this file only.
 *
 * This vertical is the only way builder inventory surfaces anywhere in the app:
 * `/properties/search` excludes builder-posted listings, by design on the
 * backend. Projects, unit types and the buyer's enquiries all hang off this
 * module. Group buy and paid booking were removed on 2026-10-19.
 */

export {
  adaptProject,
  adaptProjectDetail,
  formatDadoHeight,
  splitHighlights,
  unitFacts,
  unitPhotos,
  unitSummary,
  type ConnectivityKind,
  type ProjectPhoto,
  type UnitFactKey,
  type ProjectDetailView,
  type ProjectFactKey,
} from './adapters';
export { fetchProjects, type ProjectPage } from './api';
export { useRecentProjects, useProjectFeed, type RecentProjectsResult, type ProjectFeed } from './hooks';
export { ProjectCard, type ProjectCardProps } from './components/ProjectCard';
export { ProjectRail, type ProjectRailProps } from './components/ProjectRail';
export { ProjectList, type ProjectListProps } from './components/ProjectList';
export { FactGrid, type Fact } from './components/FactGrid';
export { ProjectListCard, type ProjectListCardProps } from './components/ProjectListCard';
export type { ProjectSummary } from './types';

export {
  useProjectDetail,
  useUnitTypesForProject,
  useUnitTypeDetail,
} from './projectDetail';

export { useMyBookings, useCreateBooking, useCancelBooking } from './bookings';
export { enquiryStatus, type EnquiryStatusView } from './enquiryStatus';

export { BookingRow, type BookingRowProps } from './components/BookingRow';
