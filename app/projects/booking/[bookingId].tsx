import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { ApiError } from '@/api';
import { SignInPrompt } from '@/auth';
import { enquiryStatus, useCancelBooking, useMyBookings } from '@/features/projects';
import { relativeDay } from '@/lib';
import { gesture, useTheme } from '@/theme';
import { USER_CANCELLABLE_STATUSES } from '@/types/backend/project';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
  Skeleton,
  Text,
  useToast,
} from '@/ui';

/**
 * One enquiry about a builder unit: what was asked about, what was sent, and
 * where it stands.
 *
 * The route keeps its old name (`/projects/booking/:id`) because both lists
 * link to it. The screen used to take a token payment (QR, UPI
 * id, screenshot, UTR) and track its verification. DealDirect takes no money
 * from users (owner decision, 2026-10-19), so all of that is gone; an older
 * record that still carries a `payment` block from that flow is shown as an
 * enquiry like any other, and its payment fields are not read.
 *
 * Sourced from `useMyBookings()` rather than a dedicated by-id endpoint: there
 * is no single-record GET, only `mine` (list) and the write routes.
 */
export default function EnquiryScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { bookings, isLoading, isRefreshing, error, refresh, signedIn } = useMyBookings();
  const { cancelBooking, isPending: isCancelling, error: cancelError } =
    useCancelBooking(bookingId);

  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const enquiry = bookings.find((b) => b._id === bookingId);

  const handleCancel = async () => {
    try {
      await cancelBooking(undefined);
      setConfirmingCancel(false);
      toast.show('Enquiry withdrawn.');
    } catch {
      // surfaced via cancelError below
    }
  };

  // A guest reaching this by deep link met "Could not load your bookings",
  // which blames the network for not being signed in. Checked after `isLoading`
  // so the undecided cold-start moment does not flash this at a signed-in user.
  if (!isLoading && !signedIn) {
    return (
      <Screen>
        <ScreenHeader title="Enquiry" backTo="/projects/bookings" />
        <SignInPrompt
          title="Sign in to see this enquiry"
          description="Your enquiries are tied to your account."
        />
      </Screen>
    );
  }

  const status = enquiryStatus(enquiry?.status);
  const canCancel = enquiry ? USER_CANCELLABLE_STATUSES.includes(enquiry.status) : false;
  const projectName =
    typeof enquiry?.project === 'object' ? enquiry.project?.basics?.name : undefined;
  const unitName =
    typeof enquiry?.unitType === 'object' ? enquiry.unitType?.config?.name : undefined;
  const sent = relativeDay(enquiry?.createdAt);

  return (
    <Screen>
      {/* Back to the list. With no `backTo`, `ScreenHeader` falls back to
          `/(tabs)`, which dropped the user out of the flow entirely. */}
      <ScreenHeader title="Enquiry" backTo="/projects/bookings" />

      {/*
        `!enquiry && isRefreshing` covers arriving from a link a moment after
        the enquiry was sent: the cached list is one item out of date, `find`
        misses, and a background refetch is already in flight. Without it the
        first thing shown would be "Enquiry not found".
      */}
      {isLoading || (!enquiry && isRefreshing) ? (
        <View className="p-base">
          <Skeleton height={200} radius={16} />
        </View>
      ) : error ? (
        <ErrorState title="Could not load your enquiries" onRetry={refresh} />
      ) : !enquiry ? (
        <EmptyState title="Enquiry not found" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
          <Card>
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-base">
                <Text variant="title3">{projectName ?? 'Project'}</Text>
                {unitName ? (
                  <Text variant="footnote" tone="secondary" className="mt-xs">
                    {unitName}
                  </Text>
                ) : null}
              </View>
              <Badge label={status.label} tone={status.tone} />
            </View>
          </Card>

          <StatusCard label={status.label} sent={sent} iconColor={theme.colors.textMuted} />

          {/* What the buyer sent, as the team will read it. */}
          <Card className="mt-base">
            <Text variant="bodyEmphasis" className="mb-sm">
              Your details
            </Text>
            <Detail label="Name" value={enquiry.clientName} />
            <Detail label="Phone" value={enquiry.clientPhone} />
            {enquiry.clientEmail ? <Detail label="Email" value={enquiry.clientEmail} /> : null}
            {enquiry.notes?.trim() ? (
              <View className="mt-sm">
                <Text variant="footnote" tone="secondary">
                  Your question
                </Text>
                <Text variant="body" className="mt-xs">
                  {enquiry.notes.trim()}
                </Text>
              </View>
            ) : null}
          </Card>

          {/*
            Withdrawal, kept quiet and two-step.

            Only offered from the statuses the server accepts
            (USER_CANCELLABLE_STATUSES, which is `enquiry` alone). Anything
            else would be an action whose normal outcome is a refusal.
          */}
          {canCancel ? (
            <View className="mt-lg items-center">
              {confirmingCancel ? (
                <Card className="w-full">
                  <Text variant="bodyEmphasis">Withdraw this enquiry?</Text>
                  <Text variant="footnote" tone="secondary" className="mt-xs">
                    You can send a new one from the unit page at any time.
                  </Text>

                  {cancelError instanceof ApiError ? (
                    <Text variant="footnote" tone="danger" className="mt-base">
                      {cancelError.message}
                    </Text>
                  ) : null}

                  <View className="mt-base flex-row">
                    <Button
                      label="Keep it"
                      variant="secondary"
                      className="flex-1"
                      onPress={() => setConfirmingCancel(false)}
                    />
                    <Button
                      label="Withdraw"
                      variant="danger"
                      className="ml-sm flex-1"
                      loading={isCancelling}
                      onPress={() => void handleCancel()}
                    />
                  </View>
                </Card>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Withdraw this enquiry"
                  hitSlop={gesture.hitSlop}
                  onPress={() => setConfirmingCancel(true)}
                  className="flex-row items-center justify-center active:opacity-60"
                >
                  <Text variant="footnote" tone="danger">
                    Withdraw this enquiry
                  </Text>
                </Pressable>
              )}
            </View>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

/**
 * Where the enquiry stands, in a sentence. Keyed on the LABEL rather than the
 * raw status so legacy statuses from the removed paid flow fall into Closed
 * here exactly as they do on the badge.
 */
function StatusCard({
  label,
  sent,
  iconColor,
}: {
  label: 'Sent' | 'Closed' | 'Withdrawn';
  sent: string | null;
  iconColor: string;
}) {
  const copy = {
    Sent: {
      icon: 'call-outline' as const,
      title: 'Enquiry sent',
      body: 'Our team will call you about this unit: availability, pricing and next steps.',
    },
    Closed: {
      icon: 'checkmark-done-outline' as const,
      title: 'Enquiry closed',
      body: 'This enquiry is closed. If you still have a question about this unit, contact us.',
    },
    Withdrawn: {
      icon: 'close-circle-outline' as const,
      title: 'Enquiry withdrawn',
      body: 'This enquiry is no longer active. You can send a new one from the unit page at any time.',
    },
  }[label];

  return (
    <Card padded={false} className="mt-base items-center px-base py-lg">
      <Ionicons name={copy.icon} size={40} color={iconColor} />
      <Text variant="bodyEmphasis" className="mt-base">
        {copy.title}
      </Text>
      <Text variant="footnote" tone="secondary" className="mt-xs text-center">
        {copy.body}
      </Text>
      {sent ? (
        <Text variant="caption" tone="muted" className="mt-sm">
          Sent {sent}
        </Text>
      ) : null}
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-baseline justify-between py-xs">
      <Text variant="body" tone="secondary" className="pr-base">
        {label}
      </Text>
      <Text variant="body" className="flex-1 text-right" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
