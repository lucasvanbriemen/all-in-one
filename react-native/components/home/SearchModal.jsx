import {useState, useEffect} from 'react';
import {StyleSheet, View, Text, TextInput, ScrollView, Image, Pressable} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {glass, useThemedStyles} from '../theme';
import {useApi} from '../useApi';
import {openSource} from '../push';
import {useDebouncedValue} from './debouncedValue';
import {player} from "../music/player";
import {api} from '../api';
import {EmailBody} from '../email/EmailBody';
import {useCompactLayout} from '../useCompactLayout';

import {useAppContext} from '../../context/AppContext';

function openResult(set, get, result) {
  if (!result) return;
  set('app.showSearch', false);

  if (result.type === 'liked_song') {
    player.play(result.full_object, set, get);
    return;
  }

  openSource(set, result.source);
}

export function SearchModal() {
  const styles = useThemedStyles(createStyles);
  const {get, set} = useAppContext();
  const open = get('app.showSearch') === true;
  const searchQuery = get('app.searchQuery') || '';
  const debouncedSearchQuery = useDebouncedValue(searchQuery);
  const {data} = useApi(`/search?query=${encodeURIComponent(debouncedSearchQuery)}`);

  const compact = useCompactLayout();
  const insets = useSafeAreaInsets();
  const results = debouncedSearchQuery.length > 0 && Array.isArray(data) ? data : [];

  const [focusedResultIndex, setFocusedResultIndex] = useState(0);
  const [focusedResult, setFocusedResult] = useState(null);

  useEffect(() => setFocusedResultIndex(0), [debouncedSearchQuery]);
  useEffect(() => setFocusedResult(results[focusedResultIndex] || null), [focusedResultIndex, results]);

  const handleKeyDown = e => {
    const key = e.nativeEvent.key;
    if (key === 'ArrowDown') {
      setFocusedResultIndex(i => Math.max(0, Math.min(i + 1, results.length - 1)));
    } else if (key === 'ArrowUp') {
      setFocusedResultIndex(i => Math.max(i - 1, 0));
    }
  };

  const openFocusedResult = () => {
    const result = results[focusedResultIndex];
    openResult(set, get, result);
  };

  if (!open) return null;

  // Phones get a full-screen, results-only sheet: no room for the preview pane,
  // and no arrow keys, so a result opens on tap.
  if (compact) {
    return (
      <View style={[styles.mobileSheet, {paddingTop: insets.top + 12, paddingBottom: insets.bottom}]}>
        <View style={styles.mobileHeader}>
          <TextInput style={styles.mobileInput} autoFocus={true} placeholder="Search..." placeholderTextColor={styles.resultSubtitle.color} value={searchQuery} onChangeText={text => set('app.searchQuery', text)} onSubmitEditing={openFocusedResult} returnKeyType="search" autoCorrect={false} autoCapitalize="none" clearButtonMode="while-editing" />
          <Pressable onPress={() => set('app.showSearch', false)} hitSlop={8}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.mobileResults}>
          {results.map((result, index) => (
            <Pressable key={index} onPress={() => openResult(set, get, result)} style={({pressed}) => [styles.result, index % 2 === 0 && styles.resultEven, pressed && styles.resultFocused]}>
              <Image source={{ uri: result.image_url }} style={styles.resultImage} />
              <View style={styles.textWrapper}>
                <Text style={styles.resultTitle} numberOfLines={1}>{result.title}</Text>
                <Text style={styles.resultSubtitle} numberOfLines={2}>{result.subtitle}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.backdrop}>
      <View style={styles.modal}>
        <TextInput style={styles.input} autoFocus={true} placeholder="Search..." value={searchQuery} onChangeText={text => set('app.searchQuery', text)} onKeyDown={handleKeyDown} keyDownEvents={[{key: 'ArrowUp'}, {key: 'ArrowDown'}]} onSubmitEditing={openFocusedResult} />

        <View style={styles.resultsContainer}>
          <View style={styles.results}>
            <ScrollView> 
              {results.map((result, index) => (
                <View key={index} style={[styles.result, index % 2 === 0 ? styles.resultEven : styles.resultOdd, focusedResultIndex === index && styles.resultFocused]}>
                  <Image source={{ uri: result.image_url }} style={styles.resultImage} />
                  <View style={styles.textWrapper}>
                    <Text style={[styles.resultTitle, focusedResultIndex === index && styles.resultFocused]}>{result.title}</Text>
                    <Text style={[styles.resultSubtitle, focusedResultIndex === index && styles.resultFocused]}>{result.subtitle}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.previewContainer}>
            {focusedResult && focusedResult.type === 'email' ? (
              <EmailPreview email={focusedResult.full_object} />
            ) : (
            <ScrollView>
              {focusedResult && focusedResult.type === 'liked_song' && (
                <SongPreview song={focusedResult.full_object} />
              )}
              {focusedResult && focusedResult.type === 'channel' && (
                <ChannelPreview channel={focusedResult.full_object} />
              )}
            </ScrollView>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function SongPreview({ song }) {
  return (
    <View>
      <Image source={{ uri: song.image_url }} style={{ width: 50, height: 50 }} />
      <Text>{song.title}</Text>
      <Text>{song.artist}</Text>
      <Text>{song.album}</Text>
      <Text>{song.duration}</Text>
    </View>
  );
}

// Search results carry no body (it made search slow), so the focused email's
// full body is fetched here. Plain api.get rather than useApi: bodies are big
// and shouldn't end up in the saved cache.
function EmailPreview({ email }) {
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    let current = true;
    setDetail(null);
    api.get('/emails/' + email.id).then(data => current && setDetail(data)).catch(() => {});
    return () => { current = false; }; // arrowing past an email drops its late response
  }, [email.id]);

  // flex: 1 gives the web view below its height; without it the body collapses to nothing.
  return (
    <View style={{flex: 1}}>
      <Text>{email.subject}</Text>
      <Text>{email.sender_name}</Text>
      {detail && <EmailBody detail={detail} />}
    </View>
  );
}

function ChannelPreview({ channel }) {
  return (
    <View>
      <Text>{channel.name}</Text>
      <Text>{channel.is_dm ? 'Direct Message' : 'Channel'}</Text>
      {channel.last_message_preview && (
        <Text numberOfLines={3}>{channel.last_message_preview}</Text>
      )}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Each pane takes exactly half the modal. With flex alone they sized to their
  // content (a long subject, a wide email) and pushed the preview off the modal.
  results: {
    width: '50%',
    minWidth: 0,
    overflow: 'hidden',
    margin: 16,
  },
  textWrapper: {
    flex: 1,
  },
  previewContainer: {
    width: '50%',
    minWidth: 0,
    overflow: 'hidden',
    borderBottomRightRadius: 16,
  },
  modal: {
    backgroundColor: colors.surfaceAt3,
    boxShadow: '0 0 190px 160px rgba(0,0,0,0.5)',
    margin: 20,
    width: '50%',
    height: '50%',
    borderRadius: 32,
  },

  input: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    color: colors.onSurface,
    borderRadius: 32,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 16,
  },
  result: {
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  resultImage: {
    width: 50,
    height: 50,
    borderRadius: 16,
  },
  resultEven: {
    backgroundColor: colors.surfaceAt2,
  },
  resultFocused: {
    backgroundColor: colors.primaryContainer,
    color: colors.onPrimaryContainer,
  },
  resultTitle: {
    fontWeight: 'bold',
    color: colors.onSurface,
  },
  resultSubtitle: {
    color: colors.outline,
  },
  mobileSheet: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceAt3,
    paddingHorizontal: 12,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  mobileInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    color: colors.onSurface,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  cancel: {
    color: colors.primary,
    fontSize: 16,
  },
  mobileResults: {
    gap: 4,
    paddingBottom: 24,
  },
  resultsContainer: {
    flex: 1,
    flexDirection: 'row',
  }
});