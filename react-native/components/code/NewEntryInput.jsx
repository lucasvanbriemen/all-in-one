import {StyleSheet, TextInput, View} from 'react-native';

import {FileIcon} from '../icons/FileIcon';
import {useState} from 'react';
import {useThemedStyles} from '../theme';

/**
 * The inline name field that appears in the tree after "New file" or
 * "New folder". Submits on Enter, cancels on Escape, blur, or an empty name.
 */
export function NewEntryInput({kind, onSubmit, onCancel}) {
  const styles = useThemedStyles(createStyles);
  const [name, setName] = useState('');

  function submit() {
    const trimmed = name.trim();

    if (!trimmed) {
      return onCancel();
    }

    onSubmit(trimmed);
  }

  return (
    <View style={styles.row}>
      <View style={styles.chevronSpacer} />

      <FileIcon name={name} isDirectory={kind === 'folder'} />

      <TextInput
        autoFocus
        style={styles.input}
        placeholder={kind === 'folder' ? 'Folder name' : 'File name'}
        placeholderTextColor={styles.placeholder.color}
        enableFocusRing={false}
        value={name}
        onChangeText={setName}
        onSubmitEditing={submit}
        onBlur={onCancel}
        onKeyDown={event => event.nativeEvent.key === 'Escape' && onCancel()}
      />
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    marginBottom: 4,
  },
  chevronSpacer: {
    width: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.primary,
    color: colors.onSurface,
  },
  placeholder: {
    color: colors.outline,
  },
});
