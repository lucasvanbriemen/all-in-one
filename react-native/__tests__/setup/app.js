/* eslint-env jest */

// The two WebViews host Monaco and xterm; under test they are inert views
// that remember the last script injected into them.
jest.mock('react-native-webview', () => {
  const React = require('react');
  const {View} = require('react-native');

  const WebView = React.forwardRef(function WebViewStub(props, ref) {
    React.useImperativeHandle(ref, () => ({
      injectJavaScript: script => {
        WebView.injected.push(script);
      },
    }));

    return React.createElement(View, {testID: 'webview', ...props});
  });

  WebView.injected = [];

  return {WebView, default: WebView};
});

jest.mock('react-native-svg', () => {
  const React = require('react');
  const {View} = require('react-native');
  const Stub = props => React.createElement(View, props);

  // Every export — Svg, Path, G, Rect, Circle, SvgXml and whatever else an
  // icon reaches for — is the same inert view.
  return new Proxy({__esModule: true, default: Stub}, {
    get: (target, name) => (name in target ? target[name] : Stub),
  });
});

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const {View} = require('react-native');

  return {
    SafeAreaView: props => React.createElement(View, props),
    SafeAreaProvider: props => React.createElement(View, props),
    useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
  };
});

// No network under test: the palette fetch resolves to an empty set and the
// glass helpers fall back to transparent. The app API's list endpoints get an
// empty list, everything else an empty object.
global.fetch = jest.fn(url => {
  const isList = /server_data|notifications|liked|songs|emails|messages/.test(String(url));
  return Promise.resolve({
    ok: true,
    status: 200,
    headers: {get: () => 'application/json'},
    json: () => Promise.resolve(isList ? [] : {config: {}}),
    text: () => Promise.resolve(''),
  });
});

global.WebSocket = class {
  constructor() {
    this.readyState = 0;
  }
  send() {}
  close() {}
};

// Native modules the app expects on macOS. Under test they answer with the
// least that lets the tree mount; the folder picker resolves to a fixed path.
const {NativeModules} = require('react-native');
NativeModules.PushNotifications = {
  requestPermission: jest.fn(() => Promise.resolve(true)),
  getConstants: () => ({bundleIdentifier: 'test', apsEnvironment: 'development'}),
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};
NativeModules.AudioPlayer = NativeModules.AudioPlayer ?? {
  addListener: jest.fn(),
  removeListeners: jest.fn(),
  getConstants: () => ({}),
};
NativeModules.FolderPicker = {pick: jest.fn(() => Promise.resolve('/tmp/picked-project'))};
