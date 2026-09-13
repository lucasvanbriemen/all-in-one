/* global globalThis */
import {Platform, UIManager, requireNativeComponent} from 'react-native';

export const NavigationBlur = (Platform.OS === 'ios' && UIManager.getViewManagerConfig?.('NavigationBlur') != null) ? (globalThis.__navigationBlur ??= requireNativeComponent('NavigationBlur')) : null;
