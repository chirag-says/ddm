/**
 * Small, pure readings of listing fields that the detail page gets wrong when
 * it trusts the stored shape.
 *
 * Each one exists because real data arrived in a form the renderer did not
 * expect: a JSON string where an array should be, a Google plus code where a
 * street should be, a number typed as a string, a locality that repeats the
 * city. The fixes are tiny, but a component is the wrong place for them
 * because the same field reaches three or four components, and each one
 * would need the same guard.
 *
 * No imports, so `node --test` loads this file directly.
 */

/**
 * Amenities as separate names, whatever shape they were stored in.
 *
 * The app's listing form sends `amenities` as one JSON-encoded list in the
 * multipart body, and until 2026-10-21 the server stored that string whole as
 * a single amenity. Listings posted before the server fix carry entries like
 * `["CCTV","Lift"]`, which the page printed brackets and all. An entry that
 * parses as a list of strings is expanded; anything else is kept as written.
 * Blanks go and duplicates collapse, so the website's empty rows do not
 * become empty pills.
 */
export function normalizeAmenities(stored: readonly unknown[] | null | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const add = (value: unknown) => {
    if (typeof value !== 'string') return;
    const trimmed = value.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(trimmed);
  };

  for (const entry of stored ?? []) {
    if (typeof entry === 'string' && entry.trim().startsWith('[')) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(entry);
      } catch {
        parsed = undefined;
      }
      if (Array.isArray(parsed)) {
        parsed.forEach(add);
        continue;
      }
    }
    add(entry);
  }

  return out;
}

/**
 * A Google plus code ("4JVH+2C9", "7JWV8G5C+XP"): the listing form's reverse
 * geocode writes one into the address line and landmark when the pin lands
 * somewhere with no street name. To a buyer it is noise that looks like a
 * typo, and the pin itself is already on the map screen.
 */
const PLUS_CODE = /^[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,3}$/i;

export function isPlusCode(value: string | undefined): boolean {
  return !!value && PLUS_CODE.test(value.trim());
}

/** The value, unless it is a plus code or blank. */
export function readableAddressLine(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || isPlusCode(trimmed)) return undefined;
  return trimmed;
}

/**
 * "Locality, City", collapsed when either is missing or when they are the same
 * place. Smaller towns outside a city carry the town's name in both fields,
 * and "Hunasamaranahalli, Hunasamaranahalli" reads as a bug rather than an
 * address.
 */
export function composeLocation(locality: string | undefined, city: string | undefined): string {
  const a = locality?.trim();
  const b = city?.trim();
  if (a && b && a.toLowerCase() === b.toLowerCase()) return a;
  return [a, b].filter(Boolean).join(', ');
}

/**
 * A `Mixed` money field as a number where it is one.
 *
 * `deposit` and `maintenance` accept either a figure or free text ("2 months",
 * "Included"). The app's form sends every figure as a string, so "120000" has
 * to be recognised as a number or it prints unformatted beside a price that is.
 * Commas and a leading rupee sign are tolerated; anything else is text.
 */
export function readMoney(value: unknown): { amount: number } | { text: string } | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? { amount: value } : undefined;
  }
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const numeric = trimmed.replace(/^₹\s*/, '').replace(/,/g, '');
  if (/^\d+(\.\d+)?$/.test(numeric)) {
    const amount = Number(numeric);
    return amount > 0 ? { amount } : undefined;
  }
  return { text: trimmed };
}

/**
 * "3 of 12", "3", or "12 floors in the building". Two fields, one fact; a row
 * reading "of 5" (the form collected the building's height but not the floor)
 * is what this replaces.
 */
export function describeFloor(floorNo: unknown, totalFloors: unknown): string | undefined {
  const floor = plainText(floorNo);
  const total = plainText(totalFloors);
  if (floor && total) return `${floor} of ${total}`;
  if (floor) return floor;
  if (total) return `${total} ${total === '1' ? 'floor' : 'floors'} in the building`;
  return undefined;
}

function plainText(value: unknown): string | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : undefined;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
