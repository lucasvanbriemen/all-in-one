// AsyncStorage is a native module, so it has to be stubbed for tests that boot
// the app — App reads the stored session on mount.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);
