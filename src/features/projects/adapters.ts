import type { Builder, Project, UnitType } from '@/types/backend/project';
import type { ProjectSummary } from './types';

/**
 * Backend `Project` to `ProjectSummary`.
 *
 * Every fallback chain in this file exists because the live data needs it.
 * Measured against all 5 live projects on 2026-08-03: 4 carry an exterior
 * image, 3 carry a builder logo, 5 carry a price range. Nothing here is
 * defensive programming against imagined nulls.
 */

/**
 * `builder` is either a populated object or a bare ObjectId string, depending
 * on the endpoint. `GET /projects` populates it with name/company/logoUrl;
 * other routes return the raw ref. Narrowing once here means no component has
 * to care which one it got.
 */
function populatedBuilder(builder: Project['builder']): Builder | undefined {
  if (!builder || typeof builder === 'string') return undefined;
  return builder;
}

/**
 * Cover image, in the order a person would pick one.
 *
 * Exterior first because it is what the project looks like from the street.
 * Drone second: dramatic, but often too far out to read at card size. Master
 * plan last and reluctantly, since a site diagram is information rather than
 * imagery, and it is still better than an empty tile.
 *
 * `locationMap` is deliberately NOT in the chain. A map screenshot as a hero
 * image reads as a broken image, not as a project.
 */
function resolveCover(media: Project['media']): string | undefined {
  if (!media) return undefined;
  return (
    media.exteriorImages?.[0] ??
    media.droneImages?.[0] ??
    media.masterPlan?.[0] ??
    undefined
  );
}

/** "Kharghar, Navi Mumbai", collapsed rather than left with a dangling comma. */
function composeLocation(locality?: string, city?: string): string {
  const parts = [locality?.trim(), city?.trim()].filter(Boolean);
  return parts.join(', ');
}

export function adaptProject(project: Project): ProjectSummary {
  const builder = populatedBuilder(project.builder);
  const city = project.location?.city?.trim();
  const locality = project.location?.locality?.trim();

  const min = project.priceRange?.min;
  const max = project.priceRange?.max;

  return {
    id: project._id,
    // Live data always has a name, but an untitled project must not render as
    // an empty heading with a price under it.
    name: project.basics?.name?.trim() || 'Unnamed project',

    status: project.basics?.status,
    category: project.basics?.category,

    city,
    locality,
    locationLabel: composeLocation(locality, city),

    coverImage: resolveCover(project.media),

    // `company` before `name`: the builder record's `name` is often a person
    // (live data has "Chirag" and "Admin"), while `company` is the brand a
    // buyer would recognise. Preferring the brand is right when it exists.
    builderName: builder?.company?.trim() || builder?.name?.trim(),
    builderLogo: builder?.logoUrl ?? builder?.logo,

    // Zero is not a price. Several projects carry `min === max`, which the card
    // renders as a single figure rather than a range of one.
    priceMin: min && min > 0 ? min : undefined,
    priceMax: max && max > 0 ? max : undefined,

    unitTypeCount: project.unitTypeCount ?? 0,

    possession: formatMonthYear(project.overview?.possessionDate),

    createdAt: project.createdAt,
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * "Dec 2029". UTC on purpose: the admin form stores midnight UTC, and reading
 * it in a zone west of UTC would turn 1 Jan into the previous December.
 */
export function formatMonthYear(iso: unknown): string | undefined {
  if (typeof iso !== 'string' || !iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function text(value: unknown): string | undefined {
  if (typeof value === 'number') return value > 0 ? String(value) : undefined;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** "5km" and "5 km" are both typed in the admin form; shown one way. */
function formatDistance(value: unknown): string | undefined {
  return text(value)?.replace(/(\d)\s*(km|m)\b/gi, (_, digit: string, unit: string) => `${digit} ${unit.toLowerCase()}`);
}

/**
 * The one line Indian portals lead a project with: what sizes, how big.
 * "2, 3 BHK" and "720 – 980 sq ft carpet", each left out when no unit type
 * carries it. Carpet area, not super built-up: it is the figure RERA makes
 * builders quote, so it is the one a buyer can compare across projects.
 */
export function unitSummary(unitTypes: readonly UnitType[]): { bhk?: string; carpet?: string } {
  const bedrooms = [
    ...new Set(unitTypes.map((u) => u.config?.bedrooms).filter((n): n is number => typeof n === 'number' && n > 0)),
  ].sort((a, b) => a - b);
  const carpet = unitTypes
    .map((u) => u.area?.carpetSqft)
    .filter((n): n is number => typeof n === 'number' && n > 0);

  const min = Math.min(...carpet);
  const max = Math.max(...carpet);
  const sqft = (n: number) => n.toLocaleString('en-IN');

  return {
    bhk: bedrooms.length > 0 ? `${bedrooms.join(', ')} BHK` : undefined,
    carpet:
      carpet.length === 0
        ? undefined
        : min === max
          ? `${sqft(min)} sq ft carpet`
          : `${sqft(min)} – ${sqft(max)} sq ft carpet`,
  };
}

/**
 * A unit's own pictures: floor plans first, they are what a buyer of an
 * under-construction flat actually looks at, then room photos labelled by
 * room. Empty on most live units; the screen falls back to project photos.
 */
export function unitPhotos(unitType: UnitType): ProjectPhoto[] {
  const photos: ProjectPhoto[] = [];
  const plan = text(unitType.floorPlans?.twoDUrl);
  const plan3d = text(unitType.floorPlans?.threeDUrl);
  if (plan) photos.push({ uri: plan, label: 'Floor plan' });
  if (plan3d) photos.push({ uri: plan3d, label: '3D floor plan' });
  for (const photo of unitType.photos ?? []) {
    const uri = text(photo?.url);
    if (!uri) continue;
    const label = text(photo.room) ?? text(photo.caption);
    photos.push(label ? { uri, label } : { uri });
  }
  return photos;
}

/**
 * Highlights as separate items.
 *
 * The admin form takes a list, but live units hold one long string ("Sundeck
 * Apartment Premium Layout Scenic Views...") that rendered as a single
 * run-on bullet. Commas, semicolons, bullets, pipes and new lines split it;
 * text with none of those is kept whole, since guessing word boundaries
 * would invent items the builder never wrote.
 */
export function splitHighlights(highlights: readonly unknown[] | undefined): string[] {
  const out: string[] = [];
  for (const entry of highlights ?? []) {
    for (const part of String(entry ?? '').split(/[,;|•\n]+/)) {
      const item = part.trim();
      if (item && !out.includes(item)) out.push(item);
    }
  }
  return out;
}

export type UnitFactKey = 'carpet' | 'builtUp' | 'superBuiltUp' | 'rate' | 'facing' | 'furnishing' | 'parking';

/** Area and configuration as facts for the grid; blanks left out. */
export function unitFacts(unitType: UnitType): { key: UnitFactKey; label: string; value: string }[] {
  const sqft = (n: number | undefined) => (n && n > 0 ? `${n.toLocaleString('en-IN')} sq ft` : undefined);
  const rate = unitType.pricing?.pricePerSqft;
  const parking = unitType.parking;
  const parkingText = [
    parking?.covered ? `${parking.covered} covered` : undefined,
    parking?.open ? `${parking.open} open` : undefined,
    parking?.ev ? `${parking.ev} EV` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  const facts: { key: UnitFactKey; label: string; value: string | undefined }[] = [
    { key: 'carpet', label: 'Carpet area', value: sqft(unitType.area?.carpetSqft) },
    { key: 'builtUp', label: 'Built-up', value: sqft(unitType.area?.builtUpSqft) },
    { key: 'superBuiltUp', label: 'Super built-up', value: sqft(unitType.area?.superBuiltUpSqft) },
    // The unit sits in the label: "₹20,139 / sq ft" wrapped in a half-width cell.
    { key: 'rate', label: 'Rate per sq ft', value: rate && rate > 0 ? `₹${Math.round(rate).toLocaleString('en-IN')}` : undefined },
    { key: 'facing', label: 'Facing', value: unitType.facing?.filter(Boolean).join(', ') || undefined },
    { key: 'furnishing', label: 'Furnishing', value: text(unitType.furnishing) },
    { key: 'parking', label: 'Parking', value: parkingText || undefined },
  ];
  return facts.filter((fact): fact is { key: UnitFactKey; label: string; value: string } => Boolean(fact.value));
}

/** "7" in the dado-height field means feet, the unit Indian spec sheets use. */
export function formatDadoHeight(value: unknown): string | undefined {
  const raw = text(value);
  return raw && /^\d+(\.\d+)?$/.test(raw) ? `${raw} ft` : raw;
}

export type ConnectivityKind = 'metro' | 'airport' | 'railway' | 'bus';

export interface ProjectDetailView extends ProjectSummary {
  description?: string;
  builderCity?: string;
  /** Exterior, drone, amenity photos, then the master plan; duplicates dropped. */
  gallery: ProjectPhoto[];
  /** Only the facts the project actually has; zeros and blanks are left out. */
  facts: { key: ProjectFactKey; label: string; value: string }[];
  /** Names only, deduplicated. Categories are dropped: six headings over ten
   *  amenities took more room than the amenities did. */
  amenities: string[];
  /** "Plot No. 5A, Sector 36, Kharghar", with the landmark when there is one. */
  address?: string;
  connectivity: { kind: ConnectivityKind; label: string; distance: string }[];
  nearby: { name: string; distance?: string }[];
}

export type ProjectFactKey = 'possession' | 'launch' | 'towers' | 'units' | 'land';

/** Same shape as the property `GalleryImage`, so both open in `PhotoViewer`. */
export interface ProjectPhoto {
  uri: string;
  label?: string;
}

// Short labels: they share a half-width column with the distance, and
// "Railway station · 25 km" wrapped on a 390pt phone.
const CONNECTIVITY: { kind: ConnectivityKind; field: string; label: string }[] = [
  { kind: 'metro', field: 'distanceToMetro', label: 'Metro' },
  { kind: 'airport', field: 'distanceToAirport', label: 'Airport' },
  { kind: 'railway', field: 'distanceToRailway', label: 'Train' },
  { kind: 'bus', field: 'distanceToBusStop', label: 'Bus' },
];

/**
 * Everything the project detail screen shows, resolved once.
 *
 * The admin panel writes amenities and nearby places as objects; records from
 * before that form hold plain strings. The screen used to keep strings only,
 * so on live data the Amenities section never rendered at all.
 */
export function adaptProjectDetail(project: Project): ProjectDetailView {
  const summary = adaptProject(project);
  const builder = populatedBuilder(project.builder);
  const media = project.media;
  const overview = project.overview;
  const location = project.location;

  // Labelled where the label tells the viewer something: a master plan in the
  // full-screen viewer should say it is one.
  const gallery: ProjectPhoto[] = [];
  const seen = new Set<string>();
  const addPhotos = (uris: readonly unknown[] | undefined, label?: string) => {
    for (const uri of uris ?? []) {
      if (typeof uri !== 'string' || !uri || seen.has(uri)) continue;
      seen.add(uri);
      gallery.push(label ? { uri, label } : { uri });
    }
  };
  addPhotos(media?.exteriorImages);
  addPhotos(media?.droneImages, 'Aerial view');
  addPhotos(media?.amenityImages, 'Amenities');
  addPhotos(media?.masterPlan, 'Master plan');

  const towers = text(overview?.totalTowers);
  const floors = text(overview?.floorsPerTower);
  const facts: { key: ProjectFactKey; label: string; value: string | undefined }[] = [
    { key: 'possession', label: 'Possession', value: summary.possession },
    { key: 'launch', label: 'Launched', value: formatMonthYear(overview?.launchDate) },
    {
      // "1 tower · G+31", not "1 · G+31": a bare number beside a floor code
      // did not say which was which.
      key: 'towers',
      label: 'Building',
      value: towers
        ? `${towers} ${towers === '1' ? 'tower' : 'towers'}${floors ? ` · ${floors}` : ''}`
        : undefined,
    },
    { key: 'units', label: 'Total units', value: text(overview?.totalUnits) },
    { key: 'land', label: 'Land area', value: text(overview?.totalLandArea) },
  ];

  const amenities: string[] = [];
  for (const amenity of project.amenities ?? []) {
    const name =
      typeof amenity === 'string' ? text(amenity) : text((amenity as { name?: unknown })?.name);
    if (name && !amenities.includes(name)) amenities.push(name);
  }

  const street = text(location?.addressLine) ?? text(location?.address);
  const landmark = text(location?.landmark);

  const nearby = (project.nearbyPlaces ?? []).flatMap((place) => {
    if (typeof place === 'string') {
      const name = text(place);
      return name ? [{ name }] : [];
    }
    const { name, distance } = (place ?? {}) as { name?: unknown; distance?: unknown };
    const label = text(name);
    return label ? [{ name: label, distance: formatDistance(distance) }] : [];
  });

  return {
    ...summary,
    description: text(project.basics?.description),
    builderCity: text(builder?.city),
    gallery,
    facts: facts.filter((fact): fact is { key: ProjectFactKey; label: string; value: string } =>
      Boolean(fact.value)
    ),
    amenities,
    address: street ? (landmark ? `${street} · ${landmark}` : street) : landmark,
    connectivity: CONNECTIVITY.flatMap(({ kind, field, label }) => {
      const distance = formatDistance(location?.connectivity?.[field]);
      return distance ? [{ kind, label, distance }] : [];
    }),
    nearby,
  };
}
