/**
 * Builder-project vertical contract. Source: backend/models/{Project,UnitType,
 * ProjectBooking,Builder}.js and their controllers.
 *
 * Group buy (`GroupBuyCampaign`, `/campaigns/*`) and every booking payment
 * type were removed on 2026-10-19, when DealDirect stopped taking money from
 * users. `ProjectBooking` is now an enquiry record.
 *
 * These four models are large and mostly admin-authored. Typed here are the
 * nested groups the PUBLIC read endpoints return, which is all the mobile app
 * consumes. Admin-only write payloads are deliberately not modelled: the app
 * never sends them, and inventing types for them would be fiction.
 *
 * Public list endpoints hide inactive records. `attachAdminIfPresent` widens
 * visibility for an admin session only, which the mobile app never has.
 */

import type { IsoDate, ObjectId, Timestamps } from './common';

export interface Builder {
  _id: ObjectId;
  name?: string;
  company?: string;
  logoUrl?: string;
  logo?: string;
  city?: string;
}

// --- Project --------------------------------------------------------------

export interface Project extends Timestamps {
  _id: ObjectId;
  builder?: ObjectId | Builder;
  createdBy?: ObjectId;
  basics?: {
    name?: string;
    category?: string;
    status?: string;
    description?: string;
    [key: string]: unknown;
  };
  location?: {
    city?: string;
    state?: string;
    locality?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    [key: string]: unknown;
  };
  nearbyPlaces?: unknown[];
  overview?: Record<string, unknown>;
  amenities?: unknown[];
  media?: {
    exteriorImages?: string[];
    droneImages?: string[];
    masterPlan?: string[];
    locationMap?: string[];
    amenityImages?: string[];
    [key: string]: unknown;
  };
  documents?: Record<string, unknown>;
  legal?: Record<string, unknown>;
  paymentPlans?: unknown[];
  /** Project-level tax and charge figures, as the builder entered them. The
   *  model also has a booking amount, which the app no longer reads. */
  financials?: {
    gstPercentage?: number;
    stampDutyPercentage?: number;
    registrationCharges?: number;
    [key: string]: unknown;
  };
  bankApprovals?: unknown[];
  constructionUpdates?: unknown[];
  salesContact?: Record<string, unknown>;
  priceRange?: {
    min?: number;
    max?: number;
    [key: string]: unknown;
  };
  unitTypeCount?: number;
  isActive?: boolean;
  /**
   * Publication lifecycle, added server-side 2026-08-22. A project is created
   * as a `draft` and only becomes publicly readable once an admin publishes it
   * past a blocking checklist.
   *
   * Nothing in this app needs to branch on it: the public list and detail
   * routes already filter to published (plus a legacy fallback for records
   * predating the field), so a draft simply is not returned. It is typed
   * because the old assumption — that visibility follows `isActive` — is no
   * longer how this works, and because `basics.status` is a CONSTRUCTION stage
   * ("Under Construction", "Ready To Move") that must never be read as
   * visibility.
   */
  publication?: {
    status?: 'draft' | 'published';
    publishedAt?: IsoDate;
    [key: string]: unknown;
  };
  /** Incremented on public detail reads only. */
  views?: number;
}

/** `GET /projects`. */
export interface ProjectListParams {
  search?: string;
  city?: string;
  category?: string;
  status?: string;
  page?: number;
  /** Backend default is 20, and it CLAMPS to a maximum of 60 — asking for more
   *  silently returns 60, it does not error. */
  limit?: number;
}

// --- UnitType -------------------------------------------------------------

export interface UnitType extends Timestamps {
  _id: ObjectId;
  project?: ObjectId | Pick<Project, '_id' | 'basics' | 'location'>;
  builder?: ObjectId | Builder;
  createdBy?: ObjectId;
  config?: {
    name?: string;
    bedrooms?: number;
    bathrooms?: number;
    [key: string]: unknown;
  };
  area?: {
    carpetSqft?: number;
    builtUpSqft?: number;
    superBuiltUpSqft?: number;
    plotAreaSqft?: number;
    plotDimensions?: { length?: number; width?: number };
    [key: string]: unknown;
  };
  facing?: string[];
  /** A single enum string ("Semi Furnished"), not an object. */
  furnishing?: string;
  parking?: { covered?: number; open?: number; ev?: number };
  specifications?: {
    structure?: string;
    flooring?: Record<string, string | undefined>;
    kitchen?: {
      countertop?: string;
      isModular?: boolean;
      chimney?: boolean;
      sink?: string;
    };
    bathroom?: { sanitaryBrand?: string; fittingsBrand?: string; dadoHeight?: string };
    doors?: { mainDoor?: string; internalDoors?: string; finish?: string };
    windows?: { type?: string; mosquitoMesh?: boolean };
    electrical?: { wiringType?: string; switchBrand?: string; acPointsPerRoom?: number };
    [key: string]: unknown;
  };
  /**
   * Corrected 2026-08-22. Previously declared `twoDFloorPlan` /
   * `threeDFloorPlan`, which are not fields on this model —
   * `backend/models/UnitType.js:119-123` declares `twoDUrl`, `threeDUrl` and
   * `videoUrl`. Both old reads were permanently `undefined`, so the floor plan
   * at the top of the unit screen never rendered once: the screen's hero image
   * has been blank since it shipped.
   */
  floorPlans?: {
    twoDUrl?: string;
    threeDUrl?: string;
    videoUrl?: string;
  };
  photos?: { url: string; room?: string; caption?: string }[];
  pricing?: {
    basePrice?: number;
    pricePerSqft?: number;
    /** base + additional charges + view premium. Taxes are NOT in here. */
    effectivePrice?: number;
    additionalCharges?: {
      plc?: number;
      parking?: number;
      clubhouse?: number;
      legal?: number;
      maintenance?: number;
    };
    viewPremium?: number;
    [key: string]: unknown;
  };
  /**
   * The government charges the unit page adds to the list price in its cost
   * sheet. They are additive and are deliberately NOT folded into
   * `pricing.effectivePrice` — they are government charges, not list price.
   *
   * The model also carries a token `bookingAmount` from the removed paid
   * booking flow. The app does not read it: nothing is collected from buyers.
   */
  paymentTerms?: {
    gstPercentage?: number;
    stampDutyPercentage?: number;
    registrationCharges?: number;
    [key: string]: unknown;
  };
  /**
   * Corrected 2026-08-22. Previously declared `{ total, available }`, which are
   * not fields on this model — `backend/models/UnitType.js:160-165` declares
   * `totalUnits`, `availableUnits`, `bookedUnits` and `blockedUnits`. Both
   * reads were therefore permanently `undefined`, so the availability chip
   * never rendered and a sold-out unit type never disabled its own booking
   * button: the buyer filled in the form and met `NO_INVENTORY` at submit.
   *
   * The invariant the server maintains is
   * `totalUnits = availableUnits + bookedUnits + blockedUnits`.
   */
  inventory?: {
    totalUnits?: number;
    availableUnits?: number;
    bookedUnits?: number;
    blockedUnits?: number;
    towerAllocation?: unknown[];
    [key: string]: unknown;
  };
  highlights?: string[];
  isActive?: boolean;
}

// --- Booking (an enquiry) ------------------------------------------------

/**
 * Open string, not a closed union. New records are `enquiry`, then `completed`
 * or `cancelled`; older records can still carry statuses from the removed paid
 * flow (`payment_submitted`, `confirmed`). See `features/projects/enquiryStatus`
 * for how each reads to the buyer.
 */
export type BookingStatus = string;

/**
 * How the record began. Every record created since 2026-10-19 is `enquiry`;
 * `booking` survives only on older records from the removed paid flow.
 */
export type BookingSource = 'enquiry' | 'booking';

/**
 * Statuses a BUYER may withdraw from. Mirrors the server's cancel route,
 * which accepts `enquiry` only (400 NOT_CANCELLABLE otherwise).
 */
export const USER_CANCELLABLE_STATUSES: readonly BookingStatus[] = ['enquiry'];

export interface ProjectBooking extends Timestamps {
  _id: ObjectId;
  project?: ObjectId | Pick<Project, '_id' | 'basics'>;
  unitType?: ObjectId | Pick<UnitType, '_id' | 'config'>;
  builder?: ObjectId | Builder;
  user?: ObjectId;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  notes?: string;
  status: BookingStatus;
  source?: BookingSource;
  statusHistory?: unknown[];
  /** Admin-maintained outreach log. Returned on `GET /bookings/my` because it
   *  lives on the document; the app does not write it. */
  contactHistory?: unknown[];
  /** Admin owning the follow-up. Not shown to the buyer. */
  assignedTo?: ObjectId | null;
  // No `payment`. New records do not have one, and an older record that does
  // is shown as an enquiry with that block ignored.
}

/**
 * `POST /bookings`. Requires an authenticated user. The enquiries-only server
 * records an enquiry whatever the body says and ignores `intent`.
 *
 * `intent: 'enquiry'` is still required here, for the server before that
 * change: without it, that server records a PAID booking, or refuses a unit
 * type with no booking amount. The app must not depend on which backend
 * deploys first.
 *
 * Refusals worth handling individually, all of them actionable:
 * - 400 `NO_INVENTORY` — `availableUnits` is not at least 1, or was never set.
 * - 409 `DUPLICATE_ENQUIRY` — this user already has one open on this unit type.
 *   Withdrawing the existing one frees the slot immediately.
 */
export interface CreateBookingRequest {
  projectId: ObjectId;
  unitTypeId: ObjectId;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  notes?: string;
  intent: 'enquiry';
}

export interface CreateBookingResponse {
  success: true;
  /** The server's confirmation sentence, shown to the buyer as is. */
  message: string;
  data: {
    bookingId: ObjectId;
    status: 'enquiry';
    source: 'enquiry';
  };
}

/** `POST /bookings/:id/cancel`. */
export interface CancelBookingRequest {
  reason?: string;
}

export interface CancelBookingResponse {
  success: true;
  /** "Enquiry withdrawn." */
  message: string;
  data: {
    status: BookingStatus;
    previousStatus: BookingStatus;
  };
}
