import {StyleSheet} from 'react-native';
import {glass, useThemedStyles} from '../theme';
import {useEffect} from 'react';

import {useAppContext} from '../../context/AppContext';

export function SearchModal() {
  const styles = useThemedStyles(createStyles);
  const {get, set} = useAppContext();
  const open = get('app.showSearch') === true;

  if (!open) return null;

  return (
    <>
      
    </>
  );
}

const createStyles = colors => StyleSheet.create({
  backdrop: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)'},
});