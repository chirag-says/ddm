/**
 * Builder-project vertical. Mounted at `/api/projects`, `/api/unit-types` and
 * `/api/bookings`. The `/api/campaigns` (group buy) routes and the booking
 * payment routes were removed on 2026-10-19: DealDirect takes no money from
 * users, and `/bookings` now records enquiries only.
 *
 * Public GET routes use `attachAdminIfPresent`, which widens visibility to
 * inactive records for an admin session. The mobile app never holds one, so it
 * sees the PUBLISHED view: since 2026-08-22 a project is publicly readable only
 * when `publication.status` is `published` (records predating the field fall
 * back to `isActive`). A newly created project is a draft and will simply not
 * appear here until an admin publishes it.
 *
 * Builder-posted properties are excluded from the regular property feeds, so
 * this vertical is the only way they surface.
 */

import type {
  CancelBookingRequest,
  CancelBookingResponse,
  CreateBookingRequest,
  CreateBookingResponse,
  Project,
  ProjectBooking,
  ProjectListParams,
  UnitType,
} from '@/types/backend/project';
import type { DataEnvelope, ObjectId, PaginatedDataEnvelope } from '@/types/backend/common';
import { defineEndpoint } from './_contract';

export const projectsEndpoints = {
  list: defineEndpoint<ProjectListParams, PaginatedDataEnvelope<Project>>({
    method: 'GET',
    path: '/projects',
    auth: 'optional',
    envelope: 'paginated',
    note:
      'Default limit 20. `search` runs a Mongo $text query, so it needs whole words and will ' +
      'not do prefix matching the way the property search regex does.',
  }),

  detail: defineEndpoint<void, DataEnvelope<Project>, { id: ObjectId }>({
    method: 'GET',
    path: ({ id }) => `/projects/${id}`,
    auth: 'optional',
    envelope: 'data',
  }),

  byBuilder: defineEndpoint<void, DataEnvelope<Project[]>, { builderId: ObjectId }>({
    method: 'GET',
    path: ({ builderId }) => `/projects/builder/${builderId}`,
    auth: 'optional',
    envelope: 'data',
    note: 'Not paginated.',
  }),
} as const;

export const unitTypesEndpoints = {
  byProject: defineEndpoint<void, DataEnvelope<UnitType[]>, { projectId: ObjectId }>({
    method: 'GET',
    path: ({ projectId }) => `/unit-types/project/${projectId}`,
    auth: 'optional',
    envelope: 'data',
    note: 'Sorted oldest-first (createdAt ascending), unlike most list endpoints.',
  }),

  detail: defineEndpoint<void, DataEnvelope<UnitType>, { id: ObjectId }>({
    method: 'GET',
    path: ({ id }) => `/unit-types/${id}`,
    auth: 'optional',
    envelope: 'data',
  }),
} as const;

export const bookingsEndpoints = {
  create: defineEndpoint<CreateBookingRequest, CreateBookingResponse>({
    method: 'POST',
    path: '/bookings',
    auth: 'user',
    envelope: 'data',
    note:
      'Records an ENQUIRY, always; any `intent` in the body is ignored and nothing is ' +
      'charged. Requires login despite reading like a public lead form. Required fields are ' +
      'projectId, unitTypeId, clientName and clientPhone. Refuses with 400 NO_INVENTORY or ' +
      '409 DUPLICATE_ENQUIRY; each is actionable and deserves its own message.',
  }),

  cancel: defineEndpoint<CancelBookingRequest, CancelBookingResponse, { id: ObjectId }>({
    method: 'POST',
    path: ({ id }) => `/bookings/${id}/cancel`,
    auth: 'user',
    envelope: 'data',
    note: 'Buyer withdraws an enquiry. Allowed only from `enquiry` (400 NOT_CANCELLABLE otherwise).',
  }),

  mine: defineEndpoint<void, DataEnvelope<ProjectBooking[]>>({
    method: 'GET',
    path: '/bookings/my',
    auth: 'user',
    envelope: 'data',
  }),
} as const;
