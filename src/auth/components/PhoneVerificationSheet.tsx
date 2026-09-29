import { useCallback, useEffect, useRef, useState } from 'react';

import { setPhoneGatePresenter } from '../phoneGate';
import { PhoneOtpSheet } from './PhoneOtpSheet';

/**
 * The just-in-time phone gate, as the user sees it.
 *
 * Mounted once, near the root. It is not routed to and no screen renders it:
 * `call()` raises it when the backend refuses a gated action, and the request
 * that was refused replays itself once this resolves. That is why it is a sheet
 * over the current screen rather than a route — routing away would lose the
 * listing the user was standing on, which is the whole thing this design
 * exists to avoid. The number-and-code flow itself is `PhoneOtpSheet`, shared
 * with the Settings "Change" action.
 */
export function PhoneVerificationSheet() {
  const [visible, setVisible] = useState(false);

  /**
   * How the sheet answers the request that raised it.
   *
   * Held in a ref rather than state because it must survive re-renders
   * untouched and must be callable from the close handler, which React would
   * otherwise have closed over at a stale value. Cleared as it is called, so a
   * second close cannot resolve the same request twice.
   */
  const resolveRef = useRef<((verified: boolean) => void) | null>(null);

  const settle = useCallback((verified: boolean) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setVisible(false);
    resolve?.(verified);
  }, []);

  /** Registered with the gate so `call()` can raise this from anywhere. */
  useEffect(() => {
    setPhoneGatePresenter(
      () =>
        new Promise<boolean>((resolve) => {
          resolveRef.current = resolve;
          setVisible(true);
        })
    );

    return () => {
      setPhoneGatePresenter(null);
      // Unmounting with a request still waiting would hang it forever. Answer
      // "not verified" so the original 403 surfaces on the screen instead.
      resolveRef.current?.(false);
      resolveRef.current = null;
    };
  }, []);

  return <PhoneOtpSheet mode="gate" visible={visible} onDone={settle} />;
}
