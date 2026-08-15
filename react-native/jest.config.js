module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transform: {
    // The RN preset's transform only matches .js/.ts/.tsx.
    '^.+\\.jsx$': 'babel-jest',
  },
};
