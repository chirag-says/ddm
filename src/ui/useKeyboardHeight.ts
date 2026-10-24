import { useEffect, useState } from 'react';
import { Keyboard, Platform, type KeyboardEvent } from 'react-native';

/**
 * How much of the screen the software keyboard currently covers, in points.
 * Zero when it is down.
 *
 * ---------------------------------------------------------------------------
 * WHY A HOOK AND NOT `KeyboardAvoidingView`
 *
 * `KeyboardAvoidingView` can only pad or resize ITSELF, which is the wrong
 * shape for anything that is positioned by its parent — a bottom sheet is laid
 * out by the modal root's `justify-end`, so the surface that has to move is one
 * the sheet's own content cannot reach. A number the layout can read solves
 * that; `KeyboardAvoidingView` still handles the ordinary full-screen form.
 *
 * Measured from the bottom of the SCREEN, so it includes whatever system bar
 * the keyboard is drawn over. A container that already reserves
 * `insets.bottom` should therefore subtract it rather than adding both — see
 * `Sheet`, which does exactly that.
 *
 * iOS listens for `Will` and Android for `Did`, which is not a preference:
 * `keyboardWillShow` is not emitted on Android at all, and on iOS the `Will`
 * pair arrives with the animation rather than after it, so the layout moves
 * with the keyboard instead of snapping once it has arrived.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (event: KeyboardEvent) => {
      // `endCoordinates.height` is the keyboard's own height; on a hardware
      // keyboard it is the accessory bar alone, which is still something the
      // layout has to clear.
      setHeight(event.endCoordinates?.height ?? 0);
    };

    /*
      Switching to a taller keyboard — emoji, or a different IME — without
      hiding the current one re-fires the SHOW event on both platforms rather
      than a hide/show pair, so the height stays current with no extra
      listener. `keyboardDidChangeFrame` is deliberately not used: on iOS it
      also fires on dismissal, carrying the keyboard's height with an
      off-screen origin, which would leave a keyboard-sized gap behind.
    */
    const show = Keyboard.addListener(showEvent, onShow);
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
