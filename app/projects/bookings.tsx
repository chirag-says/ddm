import { useRouter } from 'expo-router';
import { FlatList, View } from 'react-native';

import { SignInPrompt } from '@/auth';
import { BookingRow, useMyBookings } from '@/features/projects';
import { EmptyState, ErrorState, Screen, ScreenHeader, Skeleton } from '@/ui';

/**
 * My enquiries about builder units. Not part of the M0 route scaffold — screen
 * #42 in the architecture plan's build order, added here since
 * `bookingsEndpoints.mine` already existed with nowhere in the app that called
 * it. The route keeps the backend's `bookings` name; since 2026-10-19 every
 * record behind it is an enquiry and nothing here involves money.
 */
export default function MyEnquiriesScreen() {
  const router = useRouter();
  const { bookings, isLoading, isRefreshing, error, refresh, signedIn } = useMyBookings();

  return (
    <Screen>
      <ScreenHeader title="My enquiries" backTo="/(tabs)/profile" />

      {/* Loading is checked FIRST: during the cold-start session probe nobody
          is "signed out" yet, they are unknown, and a sign-in prompt shown to a
          returning user for half a second is a lie the app then retracts. */}
      {isLoading ? (
        <View className="px-base">
          {[0, 1].map((i) => (
            <Skeleton key={i} height={88} className="mb-base" radius={12} />
          ))}
        </View>
      ) : !signedIn ? (
        /* Not an error state. This screen is deep-linkable and sits behind a
           profile row, so arriving signed-out is ordinary, not a failure. */
        <SignInPrompt
          title="Sign in to see your enquiries"
          description="Your enquiries about builder units are tied to your account."
        />
      ) : error ? (
        <ErrorState title="Could not load your enquiries" onRetry={refresh} />
      ) : bookings.length === 0 ? (
        <EmptyState
          title="No enquiries yet"
          description="Enquire about a unit in any builder project to see it here."
          actionLabel="Browse projects"
          onAction={() => router.push('/projects')}
        />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          refreshing={isRefreshing}
          onRefresh={refresh}
          renderItem={({ item }) => (
            <BookingRow booking={item} onPress={() => router.push(`/projects/booking/${item._id}`)} />
          )}
        />
      )}
    </Screen>
  );
}
