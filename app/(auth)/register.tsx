import Ionicons from '@expo/vector-icons/Ionicons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, View } from 'react-native';

import { ApiError } from '@/api';
import {
  ageConfirmationMessage,
  AuthShell,
  canCreateAccount,
  GoogleAuthButton,
  GoogleLinkSheet,
  isGoogleSignInConfigured,
  registerSchema,
  resumeAfterAuth,
  useAuth,
  withSignupConsent,
  type RegisterValues,
  type SignupTicks,
} from '@/auth';
import { gesture, useTheme } from '@/theme';
import { Button, Input, PasswordInput, Text } from '@/ui';

/**
 * Registration. One form, for everyone.
 *
 * ---------------------------------------------------------------------------
 * WHAT USED TO BE HERE, AND WHY IT IS GONE
 *
 * This screen used to open with "I want to: Buy or rent / List a property",
 * and that choice decided everything after it. "List a property" sent the user
 * through an SMS OTP before the account existed; "Buy or rent" did not.
 *
 * Two problems. The choice was asked at the worst possible moment — before
 * anyone has seen a single listing, they are made to declare which kind of
 * person they are — and it was wrong as often as not, since most owners browse
 * before they list. And the OTP was a toll gate on a stranger who had not yet
 * been given a reason to spend one.
 *
 * So neither is asked here now. The account is created immediately, and both
 * facts are established later at the moment they actually matter:
 *
 *   - the ROLE is granted server-side the first time the account lists a
 *     property (middleware/requirePhoneVerified.js, `ensureOwnerRole`)
 *   - the PHONE is verified just in time, by a sheet the API layer raises when
 *     a gated action is refused (src/auth/phoneGate.ts)
 *
 * The phone field is gone from this form entirely. Collecting a number here
 * and verifying it later would mean asking for the same thing twice.
 */
export default function RegisterScreen() {
  const { registerDirect } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingLink, setPendingLink] = useState<{ email: string; idToken: string } | null>(null);
  // Both unticked: the 18+ tick is the user's statement, and marketing is
  // opt-in (DPDP). See src/auth/signupConsent.ts.
  const [ticks, setTicks] = useState<SignupTicks>({ ageConfirmed: false, marketingOptIn: false });
  const [tickError, setTickError] = useState<string | null>(null);
  const theme = useTheme();

  const { control, handleSubmit, formState, getValues } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      referralCode: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setTickError(null);

    try {
      await registerDirect(
        withSignupConsent({ ...values, referralCode: values.referralCode?.trim() || undefined }, ticks)
      );
      resumeAfterAuth();
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFormError('Something went wrong. Please try again.');
        return;
      }

      const ageMessage = ageConfirmationMessage(error, true);
      if (ageMessage) {
        setTickError(ageMessage);
        return;
      }

      if (error.kind === 'rateLimited') {
        setFormError('Too many attempts. Please wait a few minutes and try again.');
        return;
      }

      // An email that already belongs to a Google account cannot take a
      // password here. Point at the door that works rather than at the error.
      if (error.code === 'USE_GOOGLE_SIGNIN') {
        setFormError('This email already signs in with Google. Use Continue with Google above.');
        return;
      }

      // The backend names an email or phone that is already registered. Pass
      // that through: it is more specific than anything written here.
      setFormError(error.message);
    }
  });

  return (
    <AuthShell
      title="Create account"
      subtitle="Takes a minute. No verification code needed."
      // The longest form in the app: the short photograph, so the first
      // field is on screen before any scrolling.
      band="compact"
      footer={
        <View className="flex-row items-center justify-center">
          <Text variant="callout" tone="secondary">
            Already have an account?{' '}
          </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable hitSlop={gesture.hitSlop}>
              <Text variant="bodyEmphasis" tone="accent">
                Log in
              </Text>
            </Pressable>
          </Link>
        </View>
      }
    >
      {/* Above both buttons, because it gates both. */}
      <Tick
        checked={ticks.ageConfirmed}
        onToggle={() => {
          setTickError(null);
          setTicks((t) => ({ ...t, ageConfirmed: !t.ageConfirmed }));
        }}
        accessibilityLabel="I am 18 or older and accept the Terms and Privacy Policy"
        error={tickError}
      >
        I am 18 or older and accept the{' '}
        <Text variant="callout" tone="accent" onPress={() => router.push('/legal/terms')} accessibilityRole="link">
          Terms
        </Text>{' '}
        and{' '}
        <Text variant="callout" tone="accent" onPress={() => router.push('/legal/privacy')} accessibilityRole="link">
          Privacy Policy
        </Text>
      </Tick>
      <Tick
        checked={ticks.marketingOptIn}
        onToggle={() => setTicks((t) => ({ ...t, marketingOptIn: !t.marketingOptIn }))}
        accessibilityLabel="Send me offers and new project updates by email, SMS or WhatsApp"
      >
        Send me offers and new project updates by email, SMS or WhatsApp
      </Tick>

      <GoogleAuthButton
        referralCode={getValues('referralCode')?.trim() || undefined}
        signupTicks={ticks}
        onLinkRequired={(email, idToken) => setPendingLink({ email, idToken })}
        onSignedIn={resumeAfterAuth}
      />

      {/* The divider belongs to the Google button: with no button above it, an
          "or" announces an alternative that is not there. */}
      {isGoogleSignInConfigured() ? (
        <View className="mb-base flex-row items-center gap-sm">
          <View className="h-px flex-1 bg-border" />
          <Text variant="footnote" tone="muted">
            or sign up with email
          </Text>
          <View className="h-px flex-1 bg-border" />
        </View>
      ) : null}

      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <Input
            label="Full name"
            placeholder="Your name"
            leading={<Ionicons name="person-outline" size={18} color={theme.colors.textMuted} />}
            autoComplete="name"
            textContentType="name"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <Input
            label="Email"
            placeholder="you@example.com"
            leading={<Ionicons name="mail-outline" size={18} color={theme.colors.textMuted} />}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <PasswordInput
            label="Password"
            placeholder="Choose a password"
            leading={<Ionicons name="lock-closed-outline" size={18} color={theme.colors.textMuted} />}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            hint="At least 8 characters, with upper and lower case, a number and a symbol"
          />
        )}
      />

      <Controller
        control={control}
        name="referralCode"
        render={({ field, fieldState }) => (
          <Input
            label="Referral code (optional)"
            placeholder="Enter a code if you have one"
            leading={<Ionicons name="gift-outline" size={18} color={theme.colors.textMuted} />}
            autoCapitalize="characters"
            value={field.value ?? ''}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />

      {formError ? (
        <Text variant="footnote" tone="danger" className="mb-md">
          {formError}
        </Text>
      ) : null}

      <Button
        label="Create account"
        fullWidth
        loading={formState.isSubmitting}
        disabled={!canCreateAccount(ticks)}
        onPress={() => void onSubmit()}
      />

      <GoogleLinkSheet
        pending={pendingLink}
        onClose={() => setPendingLink(null)}
        onLinked={() => {
          setPendingLink(null);
          resumeAfterAuth();
        }}
      />
    </AuthShell>
  );
}

/** A checkbox row: the whole row toggles, a link inside the label navigates. */
function Tick({
  checked,
  onToggle,
  accessibilityLabel,
  error,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  accessibilityLabel: string;
  error?: string | null;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View className="mb-base">
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={accessibilityLabel}
        onPress={onToggle}
        className="flex-row items-start gap-sm"
      >
        <Ionicons
          name={checked ? 'checkbox' : 'square-outline'}
          size={22}
          color={checked ? theme.colors.accent : theme.colors.textMuted}
        />
        <Text variant="callout" className="flex-1">
          {children}
        </Text>
      </Pressable>
      {error ? (
        <Text variant="footnote" tone="danger" className="mt-xs">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
