import { View } from 'react-native';

import { Chip } from './Chip';
import { Select, type SelectOption } from './Select';
import { Text } from './Text';

/**
 * Up to this many options show as chips; more show as a dropdown.
 *
 * Chips put every option in view and choose in one tap, which beats a sheet
 * for "Sale / Rent" or three furnishing levels. Past four they wrap into a
 * block of buttons that is read as many separate questions (eight facing
 * chips sat directly above the room toggles and were taken for one list,
 * 2026-10-30), and a dropdown is the shorter, clearer form.
 */
export const CHIP_LIMIT = 4;

export interface ChoiceFieldProps<T extends string> {
  label: string;
  options: readonly SelectOption<T>[];
  value?: T | '';
  onChange: (value: T) => void;
  /**
   * The field may go back to "not stated": tapping the chosen chip clears it,
   * and the dropdown gets a Clear row. Leave off for a choice that must
   * always have an answer.
   */
  onClear?: () => void;
  placeholder?: string;
  error?: string;
  /** A note under the label, e.g. what a stored value no longer on the list was. */
  hint?: string;
  className?: string;
}

/**
 * One single-choice question, as chips or a dropdown by `CHIP_LIMIT`.
 *
 * One rule for the whole listing form instead of each field picking its own,
 * which is how a two-option question ended up behind a sheet and an
 * eight-option one as a wall of chips.
 */
export function ChoiceField<T extends string>({
  label,
  options,
  value,
  onChange,
  onClear,
  placeholder = 'Choose',
  error,
  hint,
  className = '',
}: ChoiceFieldProps<T>) {
  if (options.length > CHIP_LIMIT) {
    return (
      <View className={className}>
        {hint ? (
          <Text variant="caption" tone="muted" className="mb-xs">
            {hint}
          </Text>
        ) : null}
        <Select
          label={label}
          placeholder={placeholder}
          value={value || undefined}
          options={options}
          onChange={onChange}
          onClear={onClear}
          error={error}
        />
      </View>
    );
  }

  return (
    <View className={className}>
      <Text variant="subhead" tone="secondary" className="mb-xs">
        {label}
      </Text>
      {hint ? (
        <Text variant="caption" tone="muted" className="mb-xs">
          {hint}
        </Text>
      ) : null}
      <View className="flex-row flex-wrap">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Chip
              key={option.value}
              label={option.label}
              selected={selected}
              onPress={() => (selected ? onClear?.() : onChange(option.value))}
              className="mb-sm mr-sm"
            />
          );
        })}
      </View>
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
