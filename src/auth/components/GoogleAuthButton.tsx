import { Image as ExpoImage } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { ApiError } from '@/api';
import { gesture } from '@/theme';
import { Button, Text } from '@/ui';
import { useAuth, type GoogleSignInOutcome } from '../AuthProvider';
import {
  GoogleSignInCancelled,
  GoogleSignInUnavailable,
  isGoogleSignInConfigured,
} from '../googleSignIn';
import {
  ageConfirmationMessage,
  canCreateAccount,
  withSignupConsent,
  type SignupTicks,
} from '../signupConsent';

/** Google's "G" mark, the official four-colour asset. */
const GOOGLE_G = require('../../../assets/brand/google-g.svg');

export interface GoogleAuthButtonProps {
  /** Carried through a first-time sign-in so referral attribution is not lost. */
  referralCode?: string;
  /**
   * The register screen's ticks. When given, the button waits for the 18+ tick
   * and sends the ticks with the token. The login screen passes none: a
   * returning Google user is never asked, and a brand-new one the server
   * refuses is sent to Create account.
   */
  signupTicks?: SignupTicks;
  /** Called when the account already has a password and must be proved first. */
  onLinkRequired: (email: string, idToken: string) => void;
  /** Called after a session is established. */
  onSignedIn: () => void;
}

/**
 * "Continue with Google", on both the login and register screens.
 *
 * Renders NOTHING when the build has no Google client ID. A button that always
 * fails is worse than no button: it reads as a broken app rather than as a
 * feature that is not switched on, and it would be the first thing every user
 * tried. This is also what lets the app ship before the OAuth credentials
 * exist.
 *
 * Cancellation is silent. The user closing the Google sheet is them saying no,
 * not an error, and an error line under a button they deliberately dismissed is
 * the app arguing with them.
 */
export function GoogleAuthButton({
  referralCode,
  signupTicks,
  onLinkRequired,
  onSignedIn,
}: GoogleAuthButtonProps) {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSignup, setNeedsSignup] = useState(false);

  if (!isGoogleSignInConfigured()) return null;

  const onPress = async () => {
    setError(null);
    setNeedsSignup(false);
    setBusy(true);
    try {
      const outcome: GoogleSignInOutcome = await signInWithGoogle(
        signupTicks ? withSignupConsent({ referralCode }, signupTicks) : { referralCode }
      );

      if (outcome.status === 'linkRequired') {
        onLinkRequired(outcome.email, outcome.idToken);
        return;
      }

      onSignedIn();
    } catch (err) {
      if (err instanceof GoogleSignInCancelled) return;

      if (err instanceof GoogleSignInUnavailable) {
        setError(err.message);
        return;
      }

      if (err instanceof ApiError) {
        const ageMessage = ageConfirmationMessage(err, signupTicks !== undefined);
        if (ageMessage) {
          setError(ageMessage);
          setNeedsSignup(signupTicks === undefined);
          return;
        }
        if (err.code === 'ACCOUNT_BLOCKED') {
          setError(
            err.details.blockReason
              ? `Your account has been blocked: ${err.details.blockReason}`
              : 'Your account has been blocked. Please contact support.'
          );
          return;
        }
        if (err.code === 'GOOGLE_EMAIL_NOT_VERIFIED') {
          setError(
            'That Google account has no verified email address. Sign in with email and password instead.'
          );
          return;
        }
        if (err.code === 'GOOGLE_NOT_CONFIGURED') {
          setError('Google sign-in is unavailable right now. Please use email and password.');
          return;
        }
        setError(err.message);
        return;
      }

      setError('Could not sign in with Google. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="mb-base">
      <Button
        label="Continue with Google"
        variant="secondary"
        fullWidth
        loading={busy}
        disabled={signupTicks ? !canCreateAccount(signupTicks) : false}
        /*
          Google's four-colour "G", as the brand guidelines ask for on a
          "Continue with Google" control. It used to be Ionicons' monochrome
          glyph on the grounds that the project had no SVG renderer; it does
          not need one. `expo-image` decodes SVG natively on both platforms and
          Metro already treats .svg as an asset, so the mark is one file and
          no new native module (which would have changed the build fingerprint).
        */
        leading={
          <ExpoImage
            source={GOOGLE_G}
            style={{ width: 18, height: 18 }}
            contentFit="contain"
            accessible={false}
          />
        }
        onPress={() => void onPress()}
      />
      {error ? (
        <Text variant="footnote" tone="danger" className="mt-sm">
          {error}
        </Text>
      ) : null}
      {needsSignup ? (
        <Link href="/(auth)/register" asChild>
          <Pressable accessibilityRole="link" hitSlop={gesture.hitSlop} className="mt-xs">
            <Text variant="callout" tone="accent">
              Create account
            </Text>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}
