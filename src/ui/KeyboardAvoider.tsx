import React from 'react';
import { KeyboardAvoidingView, type KeyboardAvoidingViewProps } from 'react-native';

/**
 * Keyboard avoidance for a full-screen form.
 *
 * Pads its own bottom edge by however much of it the keyboard covers, so the
 * scroll view inside shrinks rather than being sat on. Getting this wrong hides
 * the submit button behind the keyboard, which is the most common reason a
 * mobile form feels broken.
 *
 * ---------------------------------------------------------------------------
 * `padding` ON ANDROID TOO, SINCE THE APP WENT EDGE-TO-EDGE — 2026-09-14
 *
 * This used `behavior="height"` on Android on the standard reasoning: the
 * window already resizes under `adjustResize`, so the view only has to accept
 * the smaller window. That stopped being true when the app set
 * `edgeToEdgeEnabled` (see `app.config.js`). An edge-to-edge window is not
 * resized by the IME — the keyboard arrives as an INSET the app is expected to
 * consume, and an app that ignores it gets its own bottom half covered. So
 * `height` measured a window that never changed, computed no offset, and every
 * field near the bottom of every form sat under the keyboard.
 *
 * `padding` does not depend on the window changing size: it measures where this
 * view's bottom edge is against where the keyboard's top edge is and pads the
 * overlap. That is correct on both platforms, and correct whether or not the
 * window resizes, so there is no longer a reason for the two to differ.
 *
 * Measuring the OVERLAP rather than adding the keyboard's height is also what
 * keeps this from fighting the safe area: a screen already inset for the
 * navigation bar has its bottom edge above that bar, so the overlap excludes
 * what the screen has already reserved.
 *
 * Bottom sheets do NOT use this — they are positioned by the modal root, so the
 * surface that has to move is not one their content can pad. `Sheet` reads
 * `useKeyboardHeight` and lifts itself.
 */

export interface KeyboardAvoiderProps extends KeyboardAvoidingViewProps {
  className?: string;
}

export function KeyboardAvoider({
  children,
  className = '',
  ...rest
}: KeyboardAvoiderProps) {
  return (
    <KeyboardAvoidingView behavior="padding" className={`flex-1 ${className}`} {...rest}>
      {children}
    </KeyboardAvoidingView>
  );
}
