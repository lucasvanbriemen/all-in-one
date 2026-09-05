import {
  EDITOR_OPTIONS,
  EXTRA_LANGUAGES,
  MONACO_CDN,
  SHIKI_CDN,
  SHIKI_LANGS,
  SHIKI_LANG_ALIAS,
  SHIKI_MONACO_CDN,
  THEMES,
  monacoTheme,
} from './monacoTheme';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, useColorScheme} from 'react-native';

import {WebView} from 'react-native-webview';
import {useTheme} from './theme';
import {useThemedStyles} from './theme';

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
  onSave,
  onSearch,
  style,
}) {
  const webView = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const colors = useTheme();
  const scheme = useColorScheme() ?? 'light';
  const styles = useThemedStyles(createStyles);

  // Monaco owns the buffers once it is up, so the document is built exactly
  // once. A `source` that changed identity on re-render would reload the frame
  // and throw away the user's edits along with the undo stacks.
  const source = useRef(null);
  source.current ??= {
    html: editorHtml({path, value, language}),
    baseUrl: `${MONACO_CDN}/`,
  };

  // Monaco owns the buffers, so a new `value` is pushed in as an edit rather
  // than by rebuilding the document. `applied` is the last file the two sides
  // agreed on — it keeps the editor's own change, which comes back through
  // `onChange` as a new prop, from being injected straight back at it. The
  // path travels with it because a switch changes both at once: the value
  // alone can't tell "the user typed" from "we are on a different file now".
  const applied = useRef({path, value, language});

  // Path and value go over together, in one message, for the same reason.
  // Pushing the value first would write the incoming file's text into the
  // outgoing file's buffer before the editor ever swapped models. `language`
  // rides along; without it the web side resolves the mode from the path
  // against Monaco's own extension registry — `.md` is only `markdown`
  // because Monaco says so.
  useEffect(() => {
    if (
      !loaded ||
      (applied.current.path === path &&
        applied.current.value === value &&
        applied.current.language === language)
    ) {
      return;
    }

    applied.current = {path, value, language};
    webView.current?.injectJavaScript(
      `window.setFile(${JSON.stringify({path, value, language})}); true;`,
    );
  }, [loaded, path, value, language]);

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
        applied.current = {path: message.path, value: message.value, language};
        onChange?.(message.value);
      }

      // The buffer the editor is asking us to write is the one it just handed
      // over, so it counts as agreed on — otherwise a save mid-keystroke would
      // come back as a `value` prop and get injected straight back at it.
      if (message.type === 'save') {
        applied.current = {path: message.path, value: message.value, language};
        onSave?.(message.value);
      }

      // Cmd+P is the app's, not the editor's — Monaco is the only thing that
      // sees the keystroke while the WebView holds focus, so it hands it back.
      if (message.type === 'search') {
        onSearch?.();
      }
    },
    [language, onChange, onSave, onSearch],
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

function editorHtml(file) {
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
      var theme = null;
      var pendingFile = null;

      // One model per file, keyed by path. Sharing a model across files shares
      // its undo stack with them: every switch pushed the new text onto the one
      // stack, so a Cmd+Z after a switch undid the switch itself and restored
      // the previous file's text into this file's buffer — which the autosave
      // then wrote to disk. A model per path keeps the histories apart, and
      // gives each buffer the URI the language workers resolve imports against.
      var models = {};

      // Cursor, selection, scroll offset and folds, stashed on the way out of a
      // file. They belong to the view rather than the model, so the swap alone
      // does not carry them.
      var viewStates = {};
      var currentPath = null;

      // Nothing is open until a file is; the buffer that stands in for it has
      // no path, so it gets no URI either. A model key has to be a string, so
      // the standin gets a name no relative path could collide with, and the
      // native side is told null, which is what it holds.
      var UNTITLED = 'untitled://none';

      function filePath() {
        return currentPath === UNTITLED ? null : currentPath;
      }

      // The two VS Code theme files, whole. Shiki reads its grammars off a CDN,
      // but a theme is the user's own file — it travels with the document.
      var THEMES = ${JSON.stringify(THEMES)};

      // Each theme run through textmateThemeToMonacoTheme, once Shiki is up.
      // Until then Monaco is still tokenizing with Monarch, whose token names
      // no TextMate rule would have matched anyway.
      var converted = null;

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

      // Called from the native side with the theme in force and the colours the
      // app, rather than the theme, owns; queues until Monaco is loaded.
      window.setTheme = function (next) {
        theme = next;
        applyTheme();
      };

      // The theme is defined twice over its life: once from the file alone, so
      // the editor is transparent and the right shade from the first frame, and
      // again once Shiki has converted the 211 TextMate rules the file carries.
      // Either way the app's own colours go on last.
      function applyTheme() {
        if (!window.monaco || !theme) {
          return;
        }

        var file = THEMES[theme.name];
        var next = converted && converted[theme.name];

        if (!next) {
          // The file's colours without its scopes: Monarch still doing the
          // tokenizing, but against the right surface.
          next = {
            base: file.type === 'dark' ? 'vs-dark' : 'vs',
            inherit: true,
            rules: [],
            colors: file.colors,
          };
        }

        monaco.editor.defineTheme(theme.name, Object.assign({}, next, {
          colors: Object.assign({}, next.colors, theme.colors),
        }));

        monaco.editor.setTheme(theme.name);
      }

      // Shiki hands Monaco VS Code's own tokenizer, so the theme's scopes
      // finally have scopes to match. It is a CDN import over WASM: slower to
      // arrive than the editor is to boot, and allowed to fail — a miss leaves
      // Monarch in place, which is what the editor came with.
      async function startShiki() {
        try {
          var shiki = await import('${SHIKI_CDN}');
          var bridge = await import('${SHIKI_MONACO_CDN}');
          var names = Object.keys(THEMES);

          var highlighter = await shiki.createHighlighter({
            themes: names.map(function (name) { return THEMES[name]; }),
            langs: ${JSON.stringify(SHIKI_LANGS)},
            langAlias: ${JSON.stringify(SHIKI_LANG_ALIAS)},
          });

          // shikiToMonaco colours a token by looking its scope up by the
          // colour it resolved, so the rules Monaco holds have to be the ones
          // it derived — same function over the same themes. applyTheme then
          // layers the app's colours back over the result.
          converted = {};
          names.forEach(function (name) {
            converted[name] = bridge.textmateThemeToMonacoTheme(
              highlighter.getTheme(name),
            );
          });

          bridge.shikiToMonaco(highlighter, monaco);
          applyTheme();
        } catch (error) {
        }
      }

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

      // Monaco keys its own model registry by URI, so a file that is reopened
      // finds the buffer it left behind rather than a fresh one — undo history
      // included. An explicit language wins over the path; neither is fatal,
      // an unknown extension stays plaintext.
      function modelFor(path, value, language) {
        var model = models[path];

        if (!model) {
          var uri = path === UNTITLED ? undefined : monaco.Uri.file(path);

          model =
            (uri && monaco.editor.getModel(uri)) ||
            monaco.editor.createModel(
              value,
              language || languageForPath(path) || 'plaintext',
              uri,
            );

          models[path] = model;
        }

        return model;
      }

      // Takes {path, value, language}. Switching files swaps the model, which
      // is what leaves the outgoing file's undo stack, cursor and scroll with
      // the outgoing file instead of dragging them into the next one.
      window.setFile = function (next) {
        if (!editor) {
          pendingFile = next;
          return;
        }

        var path = next.path || UNTITLED;
        var switching = path !== currentPath;

        if (switching && currentPath !== null) {
          viewStates[currentPath] = editor.saveViewState();
        }

        // Written before the model is attached on a switch, so the edit lands
        // on this file's own stack and never on the one being left behind.
        var model = modelFor(path, next.value, next.language);

        // A file that has moved on disk since it was last open. Anything else
        // is the editor's own text coming back around as a prop.
        if (model.getValue() !== next.value) {
          model.setValue(next.value);
        }

        var id = next.language || languageForPath(path);

        if (id && model.getLanguageId() !== id) {
          monaco.editor.setModelLanguage(model, id);
        }

        if (switching) {
          currentPath = path;
          editor.setModel(model);

          if (viewStates[path]) {
            editor.restoreViewState(viewStates[path]);
          }
        }
      };

      function post(message) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        }
      }

      require.config({paths: {vs: '${MONACO_CDN}/vs'}});
      require(['vs/editor/editor.main'], function () {
        // Registered before Shiki, which pairs its grammars against whichever
        // modes exist at the moment it runs.
        ${JSON.stringify(EXTRA_LANGUAGES)}.forEach(function (language) {
          monaco.languages.register(language);
        });

        // No model of its own: every buffer this editor shows is one setFile
        // created against a URI, and an implicit one would only be orphaned by
        // the first switch.
        editor = monaco.editor.create(document.getElementById('container'), Object.assign(
          ${JSON.stringify(EDITOR_OPTIONS)},
          {model: null}
        ));

        applyTheme();

        // Whatever the native side asked for while the loader was still
        // running, or the file the document was built around if it asked for
        // nothing.
        window.setFile(pendingFile || ${JSON.stringify(file)});
        pendingFile = null;

        // Bound after the first file, so opening one is not itself a change.
        // The listener is the editor's rather than the model's, so it follows
        // whichever model is attached.
        editor.onDidChangeModelContent(function () {
          post({type: 'change', path: filePath(), value: editor.getValue()});
        });

        // CtrlCmd is Cmd on macOS. Registering the binding with Monaco rather
        // than on the document is also what keeps WebKit from opening its own
        // save sheet — a handled keybinding never reaches the browser default.
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function () {
          post({type: 'save', path: filePath(), value: editor.getValue()});
        });

        // Same reasoning as save: bound here so the keystroke never reaches
        // WebKit, which would otherwise open its own print dialog.
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, function () {
          post({type: 'search'});
        });

        // Clicking away — into the file tree, or out of the window — is a save.
        // The native side drops the write if nothing has changed, so this is
        // free when the editor is only being tabbed through.
        editor.onDidBlurEditorText(function () {
          post({type: 'save', path: filePath(), value: editor.getValue()});
        });

        post({type: 'ready'});

        startShiki();
      });
    </script>
  </body>
</html>`;
}

const createStyles = colors => StyleSheet.create({
  editor: {
    flex: 2,
    backgroundColor: colors.surface,
    borderRadius: 16,
  },
});
