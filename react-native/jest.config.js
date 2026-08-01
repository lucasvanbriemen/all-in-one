module.exports = {
  preset: 'react-native',
  transform: {
    // The RN preset's transform only matches .js/.ts/.tsx.
    '^.+\\.jsx$': 'babel-jest',
  },
};
