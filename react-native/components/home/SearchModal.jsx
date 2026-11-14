import {useState, useEffect} from 'react';
import {StyleSheet, View, Text, TextInput, ScrollView, Image} from 'react-native';
import {glass, useThemedStyles} from '../theme';
import {useApi} from '../useApi';
import {openSource} from '../push';
import {useDebouncedValue} from './debouncedValue';
import {player} from "../music/player";
import {api} from '../api';
import {EmailBody} from '../email/EmailBody';

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

  return (
    <View style={styles.backdrop}>
      <View style={styles.modal}>
        <TextInput style={styles.input} autoFocus={true} placeholder="Search..." value={searchQuery} onChangeText={text => set('app.searchQuery', text)} onKeyDown={handleKeyDown} keyDownEvents={[{key: 'ArrowUp'}, {key: 'ArrowDown'}]} onSubmitEditing={openFocusedResult} />

        <View style={styles.resultsContainer}>
          <ScrollView> 
            {results.map((result, index) => (
              <View key={index} style={[styles.result, index % 2 === 0 ? styles.resultEven : styles.resultOdd, focusedResultIndex === index && styles.resultFocused]}>
                <Text style={[styles.resultTitle, focusedResultIndex === index && styles.resultFocused]}>{result.title}</Text>
                <Text style={[styles.resultSubtitle, focusedResultIndex === index && styles.resultFocused]}>{result.subtitle}</Text>
              </View>
            ))}
          </ScrollView>

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
  modal: {
    backgroundColor: colors.surfaceAt3,
    boxShadow: '0 0 190px 160px rgba(0,0,0,0.5)',
    margin: 20,
    width: '50%',
    height: '50%',
    borderRadius: 16,
  },

  input: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    color: colors.onSurface,
    borderRadius: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 16,
  },
  result: {
    padding: 16,
    borderRadius: 16,
    marginLeft: 16,
    marginRight: 16,
    marginTop: 16,
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
  },
  resultSubtitle: {
    color: colors.outline,
  },
  resultsContainer: {
    flex: 1,
    flexDirection: 'row',
  }
});