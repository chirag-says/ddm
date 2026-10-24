import { DetailIconList } from './DetailIconList';

/**
 * `address.nearby`, matching the website's treatment on the detail page. Typed
 * and adapted since M4, never rendered until M16 — see the note on
 * `PropertyDetail.nearby`.
 *
 * The same list as the amenities above it, with a place glyph, so a landmark
 * reads the same way as an amenity. Nothing here is selectable, and a list
 * row does not announce itself to a screen reader as a button. The section
 * heading is the screen's, not this component's.
 */
export interface NearbyPlacesProps {
  places: string[];
}

export function NearbyPlaces({ places }: NearbyPlacesProps) {
  return (
    <DetailIconList
      items={places.map((place) => ({ key: place, icon: 'location-outline', label: place }))}
      surface
    />
  );
}
