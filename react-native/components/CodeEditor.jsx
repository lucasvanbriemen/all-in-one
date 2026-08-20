import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, useColorScheme} from 'react-native';
import {WebView} from 'react-native-webview';

import {EDITOR_OPTIONS, MONACO_CDN, monacoTheme} from './monacoTheme';
import {useTheme} from './theme';

/**
 * Monaco, hosted in a WebView.
 *
 * Monaco is a DOM editor — `@monaco-editor/react` renders `<div>`s, which the
 * native renderer has no view config for. Same split as `EmailBody`: the web
 * build resolves `CodeEditor.web.jsx` and uses Monaco directly, the native
 * build gets this file and runs Monaco in the only DOM the app has.
 *
 * The page is served as an HTML string with the CDN as its base URL, so the
 * loader script counts as same-origin and WebKit doesn't refuse it.
 */
export function CodeEditor({
  value = '',
  language,
  path,
  onChange,
  style,
}) {
  const webView = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const colors = useTheme();
  const scheme = useColorScheme() ?? 'light';

  // Monaco owns the buffer once it is up, so the document is built exactly
  // once. A `source` that changed identity on re-render would reload the frame
  // and throw away the user's edits along with the undo stack.
  const source = useRef(null);
  source.current ??= {
    html: editorHtml(value, {language, path}),
    baseUrl: `${MONACO_CDN}/`,
  };

  // Monaco owns the buffer, so a new `value` is pushed in as an edit rather
  // than by rebuilding the document. `applied` is the last value the two sides
  // agreed on — it keeps the editor's own change, which comes back through
  // `onChange` as a new prop, from being injected straight back at it.
  const applied = useRef(value);

  useEffect(() => {
    if (!loaded || value === applied.current) {
      return;
    }

    applied.current = value;
    webView.current?.injectJavaScript(
      `window.setValue(${JSON.stringify(value)}); true;`,
    );
  }, [loaded, value]);

  // The document is built once, so the mode is pushed in the same way the
  // buffer is. `path` is resolved on the web side against Monaco's own
  // extension registry — `.md` is only `markdown` because Monaco says so.
  useEffect(() => {
    if (!loaded) {
      return;
    }

    webView.current?.injectJavaScript(
      `window.setLanguage(${JSON.stringify({language, path})}); true;`,
    );
  }, [loaded, language, path]);

  // The palette arrives from a fetch, so the theme is pushed in rather than
  // baked into the document.
  useEffect(() => {
    if (!loaded) {
      return;
    }

    webView.current?.injectJavaScript(
      `window.setTheme(${JSON.stringify(monacoTheme(colors, scheme))}); true;`,
    );
  }, [loaded, colors, scheme]);

  const onMessage = useCallback(
    event => {
      const message = JSON.parse(event.nativeEvent.data);

      if (message.type === 'change') {
        applied.current = message.value;
        onChange?.(message.value);
      }
    },
    [onChange],
  );

  return (
    <WebView
      ref={webView}
      style={[styles.editor, style]}
      source={source.current}
      originWhitelist={['*']}
      // `WebView.styles` sets an opaque `#ffffff` fill, and on macOS the impl
      // derives `drawsBackground` from the alpha it is handed — so anything
      // opaque here becomes a white slab over the window's blur. Both props
      // are needed: the style covers the old renderer, `opaque` the new one.
      opaque={false}
      backgroundColor="transparent"
      onLoadEnd={() => setLoaded(true)}
      onMessage={onMessage}
      // Nothing in the editor should ever navigate the app away from itself.
      onShouldStartLoadWithRequest={request =>
        request.navigationType !== 'click'
      }
    />
  );
}

function editorHtml(value, spec) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      /* A transparent WKWebView still paints whatever the document paints,
         and the default UA background is white. */
      html, body, #container {
        margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden;
        background: transparent;
      }
      .monaco-editor, .monaco-editor-background { background: transparent; }

      /* WebKit rings the focused element in the system accent colour. Monaco
         keeps focus on a hidden textarea, so the ring only ever traces the
         editor's outer edge — it reads as a stray blue border. */
      :focus, :focus-visible { outline: none; }
      .monaco-editor .overflow-guard { outline: none; }
    </style>
  </head>
  <body>
    <div id="container"></div>
    <script src="${MONACO_CDN}/vs/loader.js"></script>
    <script>
      var editor = null;
      var pendingTheme = null;
      var pendingValue = null;
      var pendingLanguage = null;

      // Monaco's language services run in workers. Pulled straight off a CDN
      // they would be cross-origin, so each worker is booted from a data: URL
      // that imports the real script instead.
      window.MonacoEnvironment = {
        getWorkerUrl: function () {
          return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(
            "self.MonacoEnvironment = { baseUrl: '${MONACO_CDN}/' };" +
            "importScripts('${MONACO_CDN}/vs/base/worker/workerMain.js');"
          );
        },
      };

      // Called from the native side; queues until Monaco is actually loaded.
      window.setTheme = function (theme) {
        if (!window.monaco) {
          pendingTheme = theme;
          return;
        }

        monaco.editor.defineTheme('app', theme);
        monaco.editor.setTheme('app');
      };

      // Monaco registers every mode with the extensions and filenames it
      // claims, so the mode for a path is a lookup rather than a table we
      // have to keep in step with it. Longest match wins, so '.d.ts' beats
      // '.ts' and a full filename beats any extension.
      function languageForPath(path) {
        if (!path) {
          return null;
        }

        var name = String(path).split('/').pop().toLowerCase();
        var best = '';
        var id = null;

        monaco.languages.getLanguages().forEach(function (language) {
          function consider(pattern, matches) {
            if (matches && pattern.length > best.length) {
              best = pattern;
              id = language.id;
            }
          }

          (language.filenames || []).forEach(function (filename) {
            consider(filename, name === filename.toLowerCase());
          });

          (language.extensions || []).forEach(function (extension) {
            consider(extension, name.endsWith(extension.toLowerCase()));
          });
        });

        return id;
      }

      // Takes {language, path} — an explicit language wins, otherwise the
      // path decides. Neither is fatal: an unknown extension stays plaintext.
      window.setLanguage = function (next) {
        if (!editor) {
          pendingLanguage = next;
          return;
        }

        var id = next.language || languageForPath(next.path);

        if (id) {
          monaco.editor.setModelLanguage(editor.getModel(), id);
        }
      };

      window.setValue = function (next) {
        if (!editor) {
          pendingValue = next;
          return;
        }

        if (editor.getValue() !== next) {
          editor.setValue(next);
        }
      };

      function post(message) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        }
      }

      require.config({paths: {vs: '${MONACO_CDN}/vs'}});
      require(['vs/editor/editor.main'], function () {
        var spec = ${JSON.stringify(spec)};

        editor = monaco.editor.create(document.getElementById('container'), Object.assign(
          ${JSON.stringify(EDITOR_OPTIONS)},
          {
            value: ${JSON.stringify(value)},
            language: spec.language || languageForPath(spec.path) || 'plaintext',
          }
        ));

        if (pendingLanguage) {
          window.setLanguage(pendingLanguage);
          pendingLanguage = null;
        }

        if (pendingTheme) {
          window.setTheme(pendingTheme);
        }

        if (pendingValue !== null) {
          window.setValue(pendingValue);
          pendingValue = null;
        }

        editor.onDidChangeModelContent(function () {
          post({type: 'change', value: editor.getValue()});
        });

        post({type: 'ready'});
      });
    </script>
  </body>
</html>`;
}

const styles = StyleSheet.create({
  editor: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
