import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { PhotoViewer, usePropertyDetail } from '@/features/properties';
import { EmptyState, ErrorState, Screen } from '@/ui';

/**
 * Full-screen photos of one property. The viewer itself is `PhotoViewer`,
 * shared with project and unit photos; this route owns loading and the states
 * around it.
 *
 * ---------------------------------------------------------------------------
 * THIS SCREEN COSTS NO EXTRA REQUEST AND NO EXTRA VIEW COUNT
 *
 * It reads through the same `usePropertyDetail(id)` the detail screen used.
 * That query runs with `staleTime: Infinity` and every automatic refetch off,
 * so arriving here from a listing is served entirely from cache — which matters
 * because `GET /properties/:id` increments the view counter, and opening the
 * photos of a listing you are already looking at is not a second view of it.
 *
 * Deep-linking straight to this route does fetch, and does count one view. That
 * is correct: it is a first look at the listing, arriving by another door.
 */
export default function PropertyGalleryScreen() {
  const router = useRouter();
  const { id, index: indexParam } = useLocalSearchParams<{ id: string; index?: string }>();

  const { property, isLoading, isMissing, error, refresh } = usePropertyDetail(id);
  const images = property?.gallery ?? [];

  const handleClose = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(`/property/${id}`);
  }, [router, id]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <StatusBar style="light" />
        <ActivityIndicator color="#ffffff" />
      </View>
    );
  }

  /*
    A FAILED FETCH IS NOT A LISTING WITHOUT PHOTOS.

    There was no error branch here at all: `images` falls back to `[]` whenever
    `property` is undefined, so any network fault or 5xx rendered "This listing
    was posted without any images" — a claim about what the owner uploaded,
    made from our own failure to load it, with no retry. Deep-linked into the
    gallery while offline, that is simply a lie about someone's listing.
  */
  if (error && !isMissing) {
    return (
      <Screen>
        <ErrorState title="Could not load the photos" onRetry={refresh} />
      </Screen>
    );
  }

  if (isMissing) {
    return (
      <Screen>
        <EmptyState
          title="Property no longer available"
          description="It may have been sold, rented, or taken down by its owner."
          actionLabel="Go back"
          onAction={handleClose}
        />
      </Screen>
    );
  }

  // Genuinely loaded, and genuinely has no photos.
  if (images.length === 0) {
    return (
      <Screen>
        <EmptyState
          title="No photos"
          description="This property was posted without any images."
          actionLabel="Back to property"
          onAction={handleClose}
        />
      </Screen>
    );
  }

  return (
    <PhotoViewer
      images={images}
      // A malformed deep link parses to NaN, which the viewer treats as 0.
      initialIndex={Number.parseInt(indexParam ?? '0', 10) || 0}
      onClose={handleClose}
    />
  );
}
