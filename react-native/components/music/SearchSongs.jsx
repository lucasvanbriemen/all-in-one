import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import React, {useEffect, useState} from 'react';

import {Song} from './Song';
import {api} from '../api';
import {player} from './player';
import {useAppContext} from '../../context/AppContext';
import {useCompactLayout} from './components/useCompactLayout';
import {useThemedStyles} from '../theme';

export function SearchSongs() {
  const styles = useThemedStyles(createStyles);

  const isCompact = useCompactLayout();

  const {set} = useAppContext();

  const [searchResults, setSearchResults] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => searchSongs(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  function searchSongs(term) {
    api.get('/music/search?term=' + term).then(response => {
      setSearchResults(response);
    });
  }

  return (
    <View style={styles.content}>
      <TextInput
        style={[styles.searchInput, isCompact && styles.searchInputCompact]}
        placeholder="Search songs..."
        onChangeText={text => setSearch(text)}
      />

      {searchResults.map((song, index) => (
        <Song key={song.isrc} song={song} isEven={index % 2 === 0} onClick={() => player.play(song, set)} />
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
    marginVertical: 16,
    color: colors.outline,
    width: '50%',
    alignSelf: 'center',
  },
  searchInputCompact: {
    width: '100%',
  },
});
