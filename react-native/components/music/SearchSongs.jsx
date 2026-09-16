import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import React, {useEffect, useState} from 'react';

import {NowPlayingBanner} from './NowPlayingBanner';
import {Song} from './Song';
import {api} from '../api';
import {player} from './player';
import {useAppContext} from '../../context/AppContext';
import {useThemedStyles} from '../theme';

export function SearchSongs() {
  const styles = useThemedStyles(createStyles);

  const {set} = useAppContext();

  const [searchResults, setSearchResults] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/music/search?term=' + search).then(response => {
      setSearchResults(response);
    });
  }, [search]);

  return (
    <View style={styles.content}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search songs..."
        onChangeText={text => setSearch(text)}
      />

      {searchResults.map((song, index) => (
        <Song key={song.isrc} song={song} isEven={index % 2 === 0} onClick={() => player.playPlaylist(searchResults, set, index)} />
      ))}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 16,
    color: colors.outline
  },
  searchInput: {
    borderColor: colors.outline,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
    color: colors.outline,
  },
});
