import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { call, bookingsEndpoints, qk } from '@/api';
import { useAuth } from '@/auth';
import type { ObjectId } from '@/types/backend/common';
import type { CreateBookingRequest } from '@/types/backend/project';

/**
 * The buyer's enquiries about builder units.
 *
 * Named after the backend route (`/bookings`), which kept its name when it
 * stopped taking money on 2026-10-19. Every record it creates is an enquiry,
 * and nothing follows it on this side but the list and a withdraw button.
 */
export function useMyBookings() {
  const { status } = useAuth();
  const signedIn = status === 'authenticated';
  // Cold start has not decided yet. Treated as loading rather than as
  // signed-out, or the screens flash a sign-in prompt at a user who is about to
  // turn out to be signed in.
  const restoring = status === 'restoring';

  const query = useQuery({
    queryKey: qk.myBookings(),
    queryFn: async ({ signal }) => {
      const response = await call(bookingsEndpoints.mine, { signal });
      return response.data;
    },
    // Without this a guest fired the request anyway and met a 401, which the
    // screen rendered as "Could not load your bookings" — an error, for the
    // ordinary state of not being signed in. The screens show a sign-in prompt
    // instead; this is what lets them.
    enabled: signedIn,
    staleTime: 15_000,
  });

  return {
    bookings: query.data ?? [],
    // `isPending` stays true forever on a disabled query, so a signed-out user
    // would sit under a skeleton that never resolves. Screens must check this
    // BEFORE `signedIn`, so that the undecided cold-start moment reads as
    // loading rather than as a refusal.
    isLoading: restoring || (signedIn && query.isPending),
    isRefreshing: query.isRefetching,
    error: query.error,
    refresh: () => void query.refetch(),
    signedIn,
  };
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (request: CreateBookingRequest) => call(bookingsEndpoints.create, { data: request }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: qk.myBookings() }),
  });

  return {
    createBooking: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/**
 * Withdraw your own enquiry. The server accepts this only while the status is
 * still `enquiry` (400 NOT_CANCELLABLE otherwise), which is why the screen
 * offers it only then.
 */
export function useCancelBooking(id: ObjectId) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (reason?: string) => {
      const trimmed = reason?.trim();
      return call(bookingsEndpoints.cancel, {
        params: { id },
        data: trimmed ? { reason: trimmed } : {},
      });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: qk.myBookings() }),
  });

  return {
    cancelBooking: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
