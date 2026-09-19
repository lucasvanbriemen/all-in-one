module.exports = {
  projects: [
    {
      displayName: 'app',
      preset: 'react-native',
      testMatch: ['<rootDir>/__tests__/**/*.test.jsx', '<rootDir>/__tests__/**/*.test.js'],
      transform: {
        // The RN preset's transform only matches .js/.ts/.tsx.
        '^.+\\.jsx$': 'babel-jest',
      },
      transformIgnorePatterns: [
        'node_modules/(?!(react-native|@react-native|react-native-.*)/)',
      ],
      setupFiles: ['<rootDir>/__tests__/setup/app.js'],
    },
    {
      displayName: 'server',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/__tests__/server/**/*.test.mjs'],
      moduleFileExtensions: ['mjs', 'js', 'json'],
      transform: {
        '^.+\\.m?js$': 'babel-jest',
      },
    },
  ],
};
