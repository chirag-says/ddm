import Ionicons from '@expo/vector-icons/Ionicons';
import React, { forwardRef, useState } from 'react';
import { Pressable, type TextInput } from 'react-native';

import { gesture, useTheme } from '@/theme';
import { Input, type InputProps } from './Input';

/**
 * Password field with show / hide.
 *
 * Every password field in the app goes through this, so none of them can be
 * missing the toggle. A password typed on a phone keyboard is mistyped often
 * enough that seeing it is the fix, and the field is the one place a user
 * cannot otherwise check what they wrote.
 *
 * Hidden by default each time the field mounts. The toggle is a real button
 * with a label that says what it will do, so a screen reader user can reveal
 * the text too. Autocorrect and capitalisation are off: both silently change
 * a password while it is hidden.
 */
export type PasswordInputProps = Omit<InputProps, 'secureTextEntry' | 'trailing'>;

export const PasswordInput = forwardRef<TextInput, PasswordInputProps>(function PasswordInput(props, ref) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <Input
      ref={ref}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      secureTextEntry={!visible}
      trailing={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          hitSlop={gesture.hitSlop}
          onPress={() => setVisible((v) => !v)}
        >
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={theme.colors.textMuted}
          />
        </Pressable>
      }
    />
  );
});
