import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // react-native-web implements the RN primitives on DOM elements.
      'react-native': 'react-native-web',
    },
    // `.web.tsx` first, so TransparentWindow.web.tsx wins over the native file
    // and requireNativeComponent never enters the web bundle. Mirrors how
    // Metro prefers `.native.tsx` / `.macos.tsx` on the native side.
    extensions: [
      '.web.tsx',
      '.web.ts',
      '.web.jsx',
      '.web.js',
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
      '.json',
    ],
  },
  define: {
    // Several RN modules branch on this; react-native-web expects it defined.
    global: 'globalThis',
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
  optimizeDeps: {
    esbuildOptions: {
      // Some react-native-web deps still ship untransformed Flow-free JSX
      // in .js files.
      loader: {'.js': 'jsx'},
    },
  },
  server: {
    port: 5173,
  },
});
