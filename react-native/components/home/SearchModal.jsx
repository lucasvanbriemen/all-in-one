import {useState, useEffect, useMemo, useRef} from 'react';
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

const KEY_DOWN_EVENTS = [{key: 'ArrowUp'}, {key: 'ArrowDown'}, {key: 'Escape'}];

// Moving the list under a resting mouse fires hover on whatever row lands under
// it; for this long after an arrow key, hover doesn't move the focus.
const HOVER_AFTER_KEY_MS = 300;

function openResult(set, get, result, query) {
  if (!result) return;
  set('app.showSearch', false);

  // Remembered so this query (and ones like it) puts this result first next time,
  // and an empty search lists it under recents. Fire-and-forget.
  api.post('/search/picks', {query, result}).catch(() => {});

  if (result.type === 'liked_song') {
    player.play(result.full_object, set, get);
    return;
  }

  openSource(set, result.source);
}

// Keeps showing the last results while a newer query is on its way, narrowed to
// what still matches what's typed, so the list never blanks or jumps while typing.
// The server's answer replaces them (in its own order) once it lands.
function useSearchResults(searchQuery) {
  const debouncedSearchQuery = useDebouncedValue(searchQuery);
  const {data} = useApi(`/search?query=${encodeURIComponent(debouncedSearchQuery.trim())}`);
  const [received, setReceived] = useState({query: null, results: []});

  useEffect(() => {
    if (Array.isArray(data)) setReceived({query: debouncedSearchQuery, results: data});
  }, [data]);

  return useMemo(() => {
    if (received.query === searchQuery) return received.results;

    const needle = searchQuery.trim().toLowerCase();
    return received.results.filter(result =>
      `${result.title || ''} ${result.subtitle || ''}`.toLowerCase().includes(needle)
    );
  }, [received, searchQuery]);
}

export function SearchModal() {
  const styles = useThemedStyles(createStyles);
  const {get, set} = useAppContext();
  const open = get('app.showSearch') === true;
  const searchQuery = get('app.searchQuery') || '';
  const results = useSearchResults(searchQuery);

  const compact = useCompactLayout();
  const insets = useSafeAreaInsets();

  const [focusedResultIndex, setFocusedResultIndex] = useState(0);
  const focusedResult = results[focusedResultIndex] || null;

  useEffect(() => setFocusedResultIndex(0), [searchQuery]);
  useEffect(() => setFocusedResultIndex(i => Math.min(i, Math.max(results.length - 1, 0))), [results.length]);

  // Keeps the focused row in view as the arrow keys move past the visible ones.
  const scrollRef = useRef(null);
  const scrollY = useRef(0);
  const viewportHeight = useRef(0);
  const rowLayouts = useRef({});
  const lastKeyAt = useRef(0);

  useEffect(() => {
    const row = rowLayouts.current[focusedResultIndex];
    if (!row || !scrollRef.current) return;

    if (row.y < scrollY.current) {
      scrollRef.current.scrollTo({y: row.y, animated: true});
    } else if (row.y + row.height > scrollY.current + viewportHeight.current) {
      scrollRef.current.scrollTo({y: row.y + row.height - viewportHeight.current, animated: true});
    }
  }, [focusedResultIndex]);

  const close = () => set('app.showSearch', false);
  const pick = result => openResult(set, get, result, searchQuery.trim());

  const handleKeyDown = e => {
    const key = e.nativeEvent.key;
    if (key === 'ArrowDown') {
      lastKeyAt.current = Date.now();
      setFocusedResultIndex(i => Math.max(0, Math.min(i + 1, results.length - 1)));
    } else if (key === 'ArrowUp') {
      lastKeyAt.current = Date.now();
      setFocusedResultIndex(i => Math.max(i - 1, 0));
    } else if (key === 'Escape') {
      close();
    }
  };

  const handleHover = index => {
    if (Date.now() - lastKeyAt.current < HOVER_AFTER_KEY_MS) return;
    setFocusedResultIndex(index);
  };

  if (!open) return null;

  // Phones get a full-screen, results-only sheet: no room for the preview pane,
  // and no arrow keys, so a result opens on tap.
  if (compact) {
    return (
      <View style={[styles.mobileSheet, {paddingTop: insets.top + 12, paddingBottom: insets.bottom}]}>
        <View style={styles.mobileHeader}>
          <TextInput style={styles.mobileInput} autoFocus={true} placeholder="Search..." placeholderTextColor={styles.resultSubtitle.color} value={searchQuery} onChangeText={text => set('app.searchQuery', text)} onSubmitEditing={() => pick(results[0])} returnKeyType="search" autoCorrect={false} autoCapitalize="none" clearButtonMode="while-editing" />
          <Pressable onPress={close} hitSlop={8}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.mobileResults}>
          {results.map((result, index) => (
            <Pressable key={result.source || index} onPress={() => pick(result)} style={({pressed}) => [styles.result, index % 2 === 0 && styles.resultEven, pressed && styles.resultFocused]}>
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
        <TextInput style={styles.input} autoFocus={true} placeholder="Search..." value={searchQuery} onChangeText={text => set('app.searchQuery', text)} onKeyDown={handleKeyDown} keyDownEvents={KEY_DOWN_EVENTS} onSubmitEditing={() => pick(focusedResult)} />

        <View style={styles.resultsContainer}>
          <View style={styles.results}>
            <ScrollView
              ref={scrollRef}
              onScroll={e => { scrollY.current = e.nativeEvent.contentOffset.y; }}
              scrollEventThrottle={16}
              onLayout={e => { viewportHeight.current = e.nativeEvent.layout.height; }}
            >
              {results.map((result, index) => {
                const focused = focusedResultIndex === index;
                return (
                  <Pressable
                    key={result.source || index}
                    onPress={() => pick(result)}
                    onHoverIn={() => handleHover(index)}
                    onLayout={e => { rowLayouts.current[index] = e.nativeEvent.layout; }}
                    style={[styles.result, index % 2 === 0 ? styles.resultEven : styles.resultOdd, focused && styles.resultFocused]}
                  >
                    <Image source={{ uri: result.image_url }} style={styles.resultImage} />
                    <View style={styles.textWrapper}>
                      <Text style={[styles.resultTitle, focused && styles.resultFocused]}>{result.title}</Text>
                      <Text style={[styles.resultSubtitle, focused && styles.resultFocused]}>{result.subtitle}</Text>
                    </View>
                  </Pressable>
                );
              })}
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