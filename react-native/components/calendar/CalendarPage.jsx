import {StyleSheet, View} from 'react-native';
import {useEffect, useState} from 'react';

import {AgendaView} from './AgendaView';
import {GoogleStatus} from './GoogleStatus';
import {MonthView} from './MonthView';
import {useAppContext} from '../../context/AppContext';
import {useThemedStyles} from '../theme';

export function CalendarPage() {
  const styles = useThemedStyles(createStyles);
  const {get} = useAppContext();

  const pages = {
    month: <MonthView />,
    agenda: <AgendaView />,
  };

  const [sidebarItem, setSidebarItem] = useState(get('app.activeSidebarItem') ?? 'month');

  useEffect(() => {
    setSidebarItem(get('app.activeSidebarItem') ?? 'month');
  }, [get]);

  return (
    <View style={styles.content}>
      <GoogleStatus />
      {pages[sidebarItem] ?? pages.month}
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  content: {flex: 1},
});
