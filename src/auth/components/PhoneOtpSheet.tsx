import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ApiError } from '@/api';
import { gesture } from '@/theme';
import { Button, Input, Sheet, Text } from '@/ui';
import { useAuth } from '../AuthProvider';
import { normalizeIndianMobile, otpSchema, phoneSchema } from '../schemas';

/**
 * Number, then SMS code, then the account's phone is the new number. One flow
 * behind two doors:
 *
 *   gate     the just-in-time check `PhoneVerificationSheet` raises when the
 *            backend refuses a gated action (first number on an account).
 *   change   Settings → "Change". Replaces a number the account already has.
 *
 * Both run `POST /users/phone/send-otp` then `/verify-otp`. The backend holds
 * the new number in `pendingPhone` and moves it onto the account only when the
 * code verifies, so closing the sheet at any point leaves the previous number
 * exactly as it was. `PUT /users/profile` refuses a changed number with
 * `PHONE_CHANGE_REQUIRES_OTP`, so this is the only way a number changes.
 *
 * ---------------------------------------------------------------------------
 * WHY THE RESEND COOLDOWN IS 45 SECONDS AND THE CAP IS REAL
 *
 * The backend allows three sends per fifteen minutes per account and burns a
 * code after five wrong guesses. Both limits are shown rather than enforced
 * silently: a code that simply stops working reads as a broken app, whereas
 * "2 attempts left" reads as a rule. The cooldown here is shorter than the
 * backend's window on purpose — it paces the user without being the thing that
 * refuses them, which is the server's job.
 */

const RESEND_COOLDOWN_SECONDS = 45;

export type PhoneOtpMode = 'gate' | 'change';

const COPY: Record<
  PhoneOtpMode,
  { title: string; intro: string; numberLabel: string; verifyLabel: string; cancelLabel: string }
> = {
  gate: {
    title: 'Verify your mobile number',
    intro:
      'One-time check. We use it to confirm a real person is behind this account before you list, enquire or claim a reward.',
    numberLabel: 'Mobile number',
    verifyLabel: 'Verify and continue',
    cancelLabel: 'Not now',
  },
  change: {
    title: 'Change mobile number',
    intro:
      'We will text a code to the new number. Your current number stays on your account until the new one is verified.',
    numberLabel: 'New mobile number',
    verifyLabel: 'Verify and change',
    cancelLabel: 'Cancel',
  },
};

type Stage = 'phone' | 'code';

export interface PhoneOtpSheetProps {
  mode: PhoneOtpMode;
  visible: boolean;
  /** `true` once the number is verified on the account, `false` for any dismissal. */
  onDone: (verified: boolean) => void;
}

export function PhoneOtpSheet({ mode, visible, onDone }: PhoneOtpSheetProps) {
  const { user, sendPhoneOtp, verifyPhoneOtp } = useAuth();
  const copy = COPY[mode];

  const [stage, setStage] = useState<Stage>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Every opening starts clean. Reset during render on the closed → open
  // edge (React's pattern for state that follows a prop), so the sheet never
  // paints one frame of the previous attempt.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setStage('phone');
      setPhone('');
      setOtp('');
      setHint(null);
      setError(null);
      setCooldown(0);
    }
  }

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const describe = (err: unknown, fallback: string): string =>
    err instanceof ApiError ? err.message : fallback;

  const onSendCode = async () => {
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid 10-digit mobile number.');
      return;
    }

    // Caught here rather than sent: the backend would answer
    // `alreadyVerified` and text nobody, which in this mode is a no-op the
    // user should be told about, not a silent close.
    if (mode === 'change' && user?.phoneVerified && parsed.data === user.phone) {
      setError('That is already your number. Enter the new one.');
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const response = await sendPhoneOtp(parsed.data);

      // The number was already this account's verified number. Nothing was
      // sent and nothing needs verifying, so the flow is simply done.
      if (response.alreadyVerified) {
        onDone(true);
        return;
      }

      setHint(response.phoneHint ?? parsed.data.slice(-2));
      setStage('code');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(describe(err, 'Could not send the verification code.'));
    } finally {
      setBusy(false);
    }
  };

  const onResend = async () => {
    setError(null);
    setBusy(true);
    try {
      await sendPhoneOtp(phone);
      setOtp('');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(describe(err, 'Could not resend the code.'));
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    const parsed = otpSchema.safeParse(otp);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter the 6-digit code.');
      return;
    }

    setError(null);
    setBusy(true);
    try {
      await verifyPhoneOtp(parsed.data);
      onDone(true);
    } catch (err) {
      if (err instanceof ApiError) {
        // The backend counts down and then burns the code. Saying how many
        // guesses remain is the difference between a rule and a malfunction.
        const remaining = err.details.attemptsRemaining;
        setError(
          typeof remaining === 'number' && remaining > 0
            ? `${err.message} ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} left.`
            : err.message
        );

        // A burned or expired code cannot be retyped into working. Send the
        // user back to the number so the obvious next action is a new code.
        if (err.code === 'OTP_EXPIRED' || err.code === 'OTP_ATTEMPTS_EXCEEDED') {
          setStage('phone');
          setOtp('');
        }
        return;
      }
      setError('Verification failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={() => onDone(false)} title={copy.title} heightRatio={0.62}>
      <View className="gap-sm">
        <Text variant="callout" tone="secondary">
          {stage === 'phone'
            ? copy.intro
            : `Enter the 6-digit code we sent to the number ending ${hint}. It expires in 10 minutes.`}
        </Text>

        {stage === 'phone' ? (
          <Input
            label={copy.numberLabel}
            prefix="+91"
            placeholder="9876543210"
            keyboardType="number-pad"
            maxLength={10}
            autoComplete="tel"
            textContentType="telephoneNumber"
            value={phone}
            // Stripped on the way in, not merely validated on the way out: a
            // number pasted from Contacts arrives as "+91 98765 43210", and
            // rejecting a correct number over its formatting is the most
            // irritating failure a form has.
            onChangeText={(text) => setPhone(normalizeIndianMobile(text))}
            error={error ?? undefined}
          />
        ) : (
          <Input
            label="Verification code"
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            value={otp}
            onChangeText={(text) => setOtp(text.replace(/\D/g, ''))}
            error={error ?? undefined}
          />
        )}

        <Button
          label={stage === 'phone' ? 'Send code' : copy.verifyLabel}
          fullWidth
          loading={busy}
          onPress={() => void (stage === 'phone' ? onSendCode() : onVerify())}
        />

        {stage === 'code' ? (
          <Pressable
            className="self-center pt-sm"
            hitSlop={gesture.hitSlop}
            disabled={cooldown > 0 || busy}
            onPress={() => void onResend()}
          >
            <Text variant="callout" tone={cooldown > 0 ? 'muted' : 'accent'}>
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          className="self-center pt-sm"
          hitSlop={gesture.hitSlop}
          onPress={() => onDone(false)}
        >
          <Text variant="footnote" tone="muted">
            {copy.cancelLabel}
          </Text>
        </Pressable>
      </View>
    </Sheet>
  );
}
