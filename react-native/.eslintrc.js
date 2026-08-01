module.exports = {
  root: true,
  extends: '@react-native',

  parserOptions: {
    // Source files are `.jsx` now, which `@react-native/eslint-config` parses
    // with @babel/eslint-parser. Babel only finds a root `babel.config.js`
    // when it is invoked from the project root, which isn't true of editor
    // integrations — so name the preset here instead of relying on lookup.
    requireConfigFile: false,
    babelOptions: {
      presets: ['module:@react-native/babel-preset'],
    },
  },

  overrides: [
    {
      // The upstream jest-env override only covers .js/.ts/.tsx.
      files: ['*.{spec,test}.jsx', '**/__tests__/**/*.jsx'],
      env: {jest: true},
    },
  ],
};
