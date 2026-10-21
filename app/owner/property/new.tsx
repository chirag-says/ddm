import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { ApiError } from '@/api';
import { OwnerOnly, ensurePhoneVerifiedBeforeUpload, useAuth } from '@/auth';
import {
  EMPTY_LISTING_FORM,
  ListingForm,
  clearListingDraft,
  hasListingDraft,
  loadListingDraft,
  saveListingDraft,
  useAddListing,
  type CategorizedPhoto,
} from '@/features/listings';
import { RewardReveal } from '@/features/rewards';
import { useTheme } from '@/theme';
import type { ActionReward } from '@/types/backend/property';
import { Screen, Text } from '@/ui';

/**
 * Add listing.
 *
 * Draft autosave writes on every field change via `saveListingDraft`, cheap
 * because MMKV is synchronous. A resumed draft is offered once on mount
 * rather than silently applied, since a stale abandoned draft overwriting a
 * fresh start would be worse than asking.
 */
function NewPropertyScreenContent() {
  const router = useRouter();
  const theme = useTheme();
  const { user, refreshUser } = useAuth();
  const userId = user?._id ?? null;
  const { add, isPending, error } = useAddListing();

  /**
   * Set synchronously on the first tap. `isPending` only disables the button
   * after a re-render, so two taps inside one frame both reached `add` and
   * posted the listing twice. The server now refuses the duplicate too; this
   * stops the second upload from being sent at all.
   */
  const submitting = useRef(false);

  const [values, setValues] = useState(EMPTY_LISTING_FORM);
  const [newPhotos, setNewPhotos] = useState<CategorizedPhoto[]>([]);
  const [pendingReward, setPendingReward] = useState<ActionReward | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  /**
   * Offered once, as soon as the account is known. This screen renders during
   * the cold-start session probe (see OwnerOnly), so on mount the user can
   * still be null, and drafts are only offered to the account that wrote them.
   */
  const draftOffered = useRef(false);
  useEffect(() => {
    if (!userId || draftOffered.current) return;
    draftOffered.current = true;
    if (!hasListingDraft(userId)) return;
    Alert.alert(
      'Resume draft?',
      'You have an unfinished listing. Continue where you left off? Photos need to be added again.',
      [
        { text: 'Start over', style: 'destructive', onPress: () => clearListingDraft() },
        { text: 'Resume', onPress: () => setValues(loadListingDraft(userId)) },
      ]
    );
  }, [userId]);

  const handleChange = (next: typeof values) => {
    setValues(next);
    saveListingDraft(next, userId);
  };

  /**
   * Listing a property earns points, and the response says how many. The
   * reveal is shown BEFORE navigating away — dismissing it is what completes
   * the submit. Navigating first would unmount this screen and take the reveal
   * with it, which is how the award went unseen before 2026-08-13.
   */
  const handleSubmit = async () => {
    if (submitting.current) return;
    submitting.current = true;

    try {
      // Verify the number before the photos go anywhere. Backing out of the
      // sheet leaves the form exactly as it was (and the draft on disk).
      if (!(await ensurePhoneVerifiedBeforeUpload(user))) return;

      const response = await add({ values, newPhotos });
      clearListingDraft();

      // The first listing is what makes an account an owner (ensureOwnerRole,
      // server-side), and the add response carries no user. Without a re-read
      // the app kept the old role, so My properties, Edit and Leads refused the
      // brand-new owner until the next cold start.
      void refreshUser();

      const propertyId = response.data._id;
      if (response.reward && response.reward.pointsAwarded > 0) {
        setPendingReward(response.reward);
        setCreatedId(propertyId);
        return;
      }

      router.replace(`/property/${propertyId}`);
    } catch {
      // surfaced via `error` below
    } finally {
      submitting.current = false;
    }
  };

  const dismissReward = () => {
    setPendingReward(null);
    if (createdId) router.replace(`/property/${createdId}`);
  };

  return (
    <Screen edges={['top']}>
      <View className="flex-row items-center px-lg pt-md pb-sm">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          onPress={() => router.back()}
          hitSlop={12}
          className="mr-sm -ml-xs h-9 w-9 items-center justify-center"
        >
          <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text variant="title2">Add listing</Text>
      </View>

      {/*
        Said up front, not discovered at Publish. Listing needs a verified
        mobile number (it is how buyers reach the owner), and an owner who
        learns that only on the last step reads it as a surprise gate.
      */}
      {user?.phoneVerified === false ? (
        <View className="flex-row items-start px-lg pb-sm">
          <Ionicons
            name="phone-portrait-outline"
            size={16}
            color={theme.colors.textSecondary}
            style={{ marginTop: 2, marginRight: 6 }}
          />
          <Text variant="footnote" tone="secondary" className="flex-1">
            Before publishing you will verify your mobile number with a one-time code, so buyers
            can reach you. Your details are saved as you go.
          </Text>
        </View>
      ) : null}

      <ListingForm
        values={values}
        onChange={handleChange}
        existingPhotos={[]}
        onChangeExistingPhotos={() => {}}
        newPhotos={newPhotos}
        onChangeNewPhotos={setNewPhotos}
        onSubmit={() => void handleSubmit()}
        submitLabel="Publish listing"
        isSubmitting={isPending}
        submitError={error instanceof ApiError ? error.message : undefined}
      />

      <RewardReveal reward={pendingReward} onDismiss={dismissReward} />
    </Screen>
  );
}

/**
 * Sign-in gated, but deliberately NOT owner-gated.
 *
 * This is the route that makes an owner. `ensureOwnerRole` grants the role
 * server-side when an account first posts a listing, behind the phone check, so
 * a buyer standing here is not in the wrong place — they are one form away from
 * being an owner. Refusing them would close the only door into the role, and
 * the refusal screen's own "List a property" action would loop back here.
 *
 * A signed-OUT visitor is still refused, and every other /owner route still
 * requires an account that already owns something.
 */
export default function NewPropertyScreen() {
  return (
    <OwnerOnly title="Add listing" allowNewOwners>
      <NewPropertyScreenContent />
    </OwnerOnly>
  );
}
