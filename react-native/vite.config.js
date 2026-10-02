import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // react-native-web implements the RN primitives on DOM elements.
      // Anchored so deep imports such as `react-native/Libraries/...` (which
      // some libraries' native specs use) aren't rewritten to paths that don't
      // exist inside react-native-web.
      {find: /^react-native$/, replacement: 'react-native-web'},
      // Use the ESM build so `.web.js` siblings (SafeAreaView.web.js, ...)
      // resolve instead of the native codegen specs.
      {
        find: /^react-native-safe-area-context$/,
        replacement: 'react-native-safe-area-context/lib/module/index.js',
      },
    ],
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
    // Pre-bundling would resolve this package through its native entry; let
    // Vite's own resolver (with the `.web.js` extension order above) handle it.
    exclude: [
      'react-native-safe-area-context',
      'react-native-safe-area-context/lib/module/index.js',
    ],
    esbuildOptions: {
      // The dependency scanner resolves relative imports inside node_modules
      // with esbuild's own extension list, which would pick `SafeAreaView.js`
      // (native codegen) over `SafeAreaView.web.js`. Mirror `resolve.extensions`.
      resolveExtensions: [
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
      // Some react-native-web deps still ship untransformed Flow-free JSX
      // in .js files.
      loader: {'.js': 'jsx'},
    },
  },
  server: {
    port: 5173,
    // The browser enforces CORS, so `components/api.js` sends requests to
    // `/__api/...` on web and this forwards them to the Rails server.
    // Override the target with `VITE_API_TARGET=https://aio.ltvb.nl npm run web`.
    proxy: {
      '/__api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/__api/, ''),
      },
    },
  },
});
