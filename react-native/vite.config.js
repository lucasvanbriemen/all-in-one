import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // react-native-web implements the RN primitives on DOM elements.
      'react-native': 'react-native-web',
    },
    // `.web.jsx` first, so TransparentWindow.web.jsx wins over the native file
    // and requireNativeComponent never enters the web bundle. Mirrors how
    // Metro prefers `.native.jsx` / `.macos.jsx` on the native side.
    //
    // `.tsx` / `.ts` stay in the list only for react-native-web's own deps.
    extensions: [
      '.web.jsx',
      '.web.js',
      '.web.tsx',
      '.web.ts',
      '.jsx',
      '.js',
      '.tsx',
      '.ts',
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
