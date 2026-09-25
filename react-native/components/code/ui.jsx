import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import React, {useState} from 'react';
import {glass, useThemedStyles, withAlpha} from '../theme';

/** Fixed, theme-independent colours for git state — the same ones every editor uses. */
export const GIT_COLORS = {
  added: '#3fb950',
  untracked: '#3fb950',
  modified: '#d29922',
  deleted: '#f85149',
  renamed: '#58a6ff',
  conflict: '#f85149',
};

export const SEVERITY_COLORS = {
  error: '#f85149',
  warning: '#d29922',
  info: '#58a6ff',
  hint: '#8b949e',
};

/**
 * A small text button. `tone` picks the material: `accent` for the primary
 * action in a view, `subtle` for everything else, `danger` for deletes.
 */
export function SmallButton({title, onPress, tone = 'subtle', disabled = false, style, testID}) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      style={({pressed}) => [
        styles.button,
        tone === 'accent' && styles.buttonAccent,
        tone === 'danger' && styles.buttonDanger,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}>
      <Text style={[styles.buttonText, tone === 'accent' && styles.buttonTextAccent, tone === 'danger' && styles.buttonTextDanger]}>
        {title}
      </Text>
    </Pressable>
  );
}

/** A glyph-only button for row actions; `label` is the accessibility name and tooltip. */
export function IconButton({glyph, label, onPress, tone, size = 14, style, testID}) {
  const styles = useThemedStyles(createStyles);
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      onPress={event => {
        event?.stopPropagation?.();
        onPress?.(event);
      }}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityLabel={label}
      accessibilityRole="button"
      tooltip={label}
      testID={testID}
      hitSlop={4}
      style={[styles.iconButton, hovered && styles.iconButtonHovered, style]}>
      <Text style={[styles.iconGlyph, {fontSize: size}, tone === 'danger' && styles.buttonTextDanger]}>{glyph}</Text>
    </Pressable>
  );
}

export function SectionTitle({title, right, style}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.sectionTitle, style]}>
      <Text style={styles.sectionTitleText}>{title}</Text>
      {right}
    </View>
  );
}

export function Field({value, onChangeText, placeholder, onSubmitEditing, onKeyPress, autoFocus, inputRef, style, monospace, testID, secureTextEntry}) {
  const styles = useThemedStyles(createStyles);

  return (
    <TextInput
      ref={inputRef}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={styles.placeholder.color}
      onSubmitEditing={onSubmitEditing}
      onKeyPress={onKeyPress}
      autoFocus={autoFocus}
      autoCapitalize="none"
      autoCorrect={false}
      spellCheck={false}
      enableFocusRing={false}
      blurOnSubmit={false}
      secureTextEntry={secureTextEntry}
      testID={testID}
      style={[styles.field, monospace && styles.mono, style]}
    />
  );
}

export function Toggle({label, value, onChange, description}) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable onPress={() => onChange(!value)} style={styles.toggleRow} accessibilityRole="switch" accessibilityState={{checked: value}}>
      <View style={[styles.toggle, value && styles.toggleOn]}>
        <View style={[styles.knob, value && styles.knobOn]} />
      </View>
      <View style={{flex: 1}}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {description ? <Text style={styles.toggleDescription}>{description}</Text> : null}
      </View>
    </Pressable>
  );
}

/** A count in a rounded pill — for tabs and the panel switcher. */
export function Badge({count, color}) {
  const styles = useThemedStyles(createStyles);

  if (!count) {
    return null;
  }

  return (
    <View style={[styles.badge, color && {backgroundColor: color}]}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

export function EmptyState({title, hint}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  button: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    ...glass(colors, {variant: 'subtle'}),
  },
  buttonAccent: {
    ...glass(colors, {variant: 'accent'}),
  },
  buttonDanger: {
    borderColor: GIT_COLORS.deleted,
  },
  buttonText: {
    color: colors.onSurface,
    fontSize: 12,
    fontWeight: '500',
  },
  buttonTextAccent: {
    color: colors.onPrimary,
  },
  buttonTextDanger: {
    color: GIT_COLORS.deleted,
  },
  disabled: {opacity: 0.4},
  pressed: {opacity: 0.7},
  iconButton: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonHovered: {
    backgroundColor: withAlpha(colors.onSurface, 0.1),
  },
  iconGlyph: {
    color: colors.onSurface,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 6,
  },
  sectionTitleText: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  field: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    color: colors.onSurface,
    fontSize: 13,
    ...glass(colors, {variant: 'subtle'}),
  },
  mono: {
    fontFamily: 'Menlo',
  },
  placeholder: {
    color: withAlpha(colors.onSurfaceVariant, 0.7),
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  toggle: {
    width: 32,
    height: 18,
    borderRadius: 9,
    padding: 2,
    backgroundColor: withAlpha(colors.onSurface, 0.2),
  },
  toggleOn: {
    backgroundColor: colors.primary,
  },
  knob: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
  },
  knobOn: {
    marginLeft: 14,
  },
  toggleLabel: {
    color: colors.onSurface,
    fontSize: 13,
  },
  toggleDescription: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    marginTop: 1,
  },
  badge: {
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  empty: {
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  emptyTitle: {
    color: colors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyHint: {
    color: withAlpha(colors.onSurfaceVariant, 0.8),
    fontSize: 12,
    textAlign: 'center',
  },
});
