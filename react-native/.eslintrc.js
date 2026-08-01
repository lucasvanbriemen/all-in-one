const path = require('path');

module.exports = {
  root: true,
  extends: '@react-native',

  parserOptions: {
    // Source files are `.jsx` now, which `@react-native/eslint-config` parses
    // with @babel/eslint-parser. Babel only discovers a root `babel.config.js`
    // when it runs from the project root, which isn't true of editor
    // integrations — so point at it explicitly.
    babelOptions: {
      configFile: path.join(__dirname, 'babel.config.js'),
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
