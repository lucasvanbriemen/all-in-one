import {
  EDITOR_OPTIONS,
  EXTRA_LANGUAGES,
  MONACO_CDN,
  SHIKI_LANGS,
  SHIKI_LANG_ALIAS,
  THEMES,
  monacoTheme,
} from './monacoTheme';
import React, {forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState} from 'react';
import {StyleSheet, useColorScheme} from 'react-native';

import {CDN_SOURCES} from './code/vendor';
import {WebView} from 'react-native-webview';
import {fileSystem} from './fileSystem';
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
 * The page is served as an HTML string whose base URL is wherever Monaco is
 * loaded from — the file server when it is up, the CDN otherwise — so the
 * loader script counts as same-origin and WebKit doesn't refuse it.
 *
 * Everything that crosses the bridge is a message. Native -> page is
 * `injectJavaScript` of a `window.*` call; page -> native is `postMessage`
 * with a `type`. The ref exposes the calls the page wants as methods.
 */
export const CodeEditor = forwardRef(function CodeEditor(
  {
    value = '',
    language,
    path,
    projectRoot,
    sources = CDN_SOURCES,
    appKeys,
    gitChanges,
    diffOriginal = null,
    onChange,
    onSave,
    onCommand,
    onOpenFile,
    onCursor,
    onDiagnostics,
    onActions,
    onLoadError,
    onFocus,
    style,
  },
  ref,
) {
  const webView = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const colors = useTheme();
  const scheme = useColorScheme() ?? 'light';
  const styles = useThemedStyles(createStyles);

  const inject = useCallback(script => {
    webView.current?.injectJavaScript(`${script} true;`);
  }, []);

  const call = useCallback(
    (name, ...args) => {
      inject(`window.${name}(${args.map(argument => jsString(argument)).join(', ')});`);
    },
    [inject],
  );

  // Monaco owns the buffers once it is up, so the document is built exactly
  // once. A `source` that changed identity on re-render would reload the frame
  // and throw away the user's edits along with the undo stacks.
  const source = useRef(null);
  source.current ??= {
    html: editorHtml({path, value, language, projectRoot}, sources),
    baseUrl: `${sources.monaco}/`,
  };

  // Monaco owns the buffers, so a new `value` is pushed in as an edit rather
  // than by rebuilding the document. `applied` is the last file the two sides
  // agreed on — it keeps the editor's own change, which comes back through
  // `onChange` as a new prop, from being injected straight back at it. The
  // path travels with it because a switch changes both at once: the value
  // alone can't tell "the user typed" from "we are on a different file now".
  const applied = useRef({path, value, language});

  useEffect(() => {
    if (!loaded) {
      return;
    }

    call('setProject', projectRoot ?? null);
  }, [loaded, projectRoot, call]);

  // Path and value go over together, in one message, for the same reason.
  // Pushing the value first would write the incoming file's text into the
  // outgoing file's buffer before the editor ever swapped models.
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
    call('setFile', {path, value, language});
  }, [loaded, path, value, language, call]);

  // The palette arrives from a fetch, so the theme is pushed in rather than
  // baked into the document.
  useEffect(() => {
    if (!loaded) {
      return;
    }

    call('setTheme', monacoTheme(colors, scheme));
  }, [loaded, colors, scheme, call]);

  useEffect(() => {
    if (!loaded || !appKeys) {
      return;
    }

    call('setAppKeys', appKeys);
  }, [loaded, appKeys, call]);

  useEffect(() => {
    if (!loaded || !path) {
      return;
    }

    call('setGitChanges', path, gitChanges ?? []);
  }, [loaded, path, gitChanges, call]);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    if (diffOriginal === null || diffOriginal === undefined) {
      call('hideDiff');
    } else {
      call('showDiff', diffOriginal);
    }
  }, [loaded, diffOriginal, call]);

  // Language servers. The page asks for one per language it meets; the socket
  // is dialled from here because the page is a secure context and may not open
  // a plain `ws://` itself. Messages are relayed verbatim in both directions.
  const servers = useRef(new Map());

  const closeServers = useCallback(() => {
    for (const socket of servers.current.values()) {
      socket.onmessage = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.close();
    }
    servers.current.clear();
  }, []);

  const openServer = useCallback(
    lang => {
      if (servers.current.has(lang) || !projectRoot) {
        return;
      }

      let socket;
      try {
        socket = new WebSocket(fileSystem.lspUrl(projectRoot, lang));
      } catch (error) {
        call('lspUnavailable', lang);
        return;
      }

      servers.current.set(lang, socket);

      socket.onmessage = event => {
        const message = JSON.parse(event.data);

        if (message.type === 'ready') {
          call('lspReady', lang, message.server);
        } else if (message.type === 'message') {
          call('lspReceive', lang, message.body);
        } else if (message.type === 'unavailable' || message.type === 'error' || message.type === 'exit') {
          call('lspUnavailable', lang);
        }
      };

      socket.onerror = () => call('lspUnavailable', lang);
      socket.onclose = () => {
        if (servers.current.get(lang) === socket) {
          servers.current.delete(lang);
        }
      };
    },
    [projectRoot, call],
  );

  // A new project means new servers: their roots are fixed when spawned.
  useEffect(() => {
    closeServers();
    if (loaded) {
      call('resetLanguageServers');
    }
  }, [projectRoot, loaded, closeServers, call]);

  useEffect(() => () => closeServers(), [closeServers]);

  const pendingActions = useRef([]);

  useImperativeHandle(
    ref,
    () => ({
      revealPosition: (line, column = 1) => call('revealPosition', line, column),
      requestSave: (format = false) => call('requestSave', format),
      runAction: id => call('runAction', id),
      focus: () => call('focusEditor'),
      find: term => call('openFind', term ?? ''),
      listActions: () =>
        new Promise(resolve => {
          pendingActions.current.push(resolve);
          call('listActions');
        }),
      reload: () => webView.current?.reload(),
    }),
    [call],
  );

  const onMessage = useCallback(
    event => {
      const message = JSON.parse(event.nativeEvent.data);

      switch (message.type) {
        case 'ready':
          setLoaded(true);
          break;

        case 'loadError':
          onLoadError?.(message);
          break;

        case 'change':
          applied.current = {path: message.path, value: message.value, language};
          onChange?.(message.value, message.path);
          break;

        // The buffer the editor is asking us to write is the one it just
        // handed over, so it counts as agreed on — otherwise a save
        // mid-keystroke would come back as a `value` prop and get injected
        // straight back at it.
        case 'save':
          applied.current = {path: message.path, value: message.value, language};
          onSave?.(message.value, message.path, Boolean(message.blur));
          break;

        // A shortcut that belongs to the app rather than to the editor —
        // Monaco is the only thing that sees the keystroke while the WebView
        // holds focus, so it hands it back.
        case 'key':
          onCommand?.(message);
          break;

        case 'focus':
          onFocus?.();
          break;

        case 'openFile':
          onOpenFile?.(message);
          break;

        case 'cursor':
          onCursor?.(message);
          break;

        case 'diagnostics':
          onDiagnostics?.(message);
          break;

        case 'actions': {
          const waiting = pendingActions.current.splice(0);
          waiting.forEach(resolve => resolve(message.actions));
          onActions?.(message.actions);
          break;
        }

        case 'lspOpen':
          openServer(message.language);
          break;

        case 'lsp': {
          const socket = servers.current.get(message.language);
          if (socket?.readyState === 1) {
            socket.send(JSON.stringify({type: 'message', body: message.body}));
          }
          break;
        }

        default:
          break;
      }
    },
    [language, onChange, onSave, onCommand, onOpenFile, onCursor, onDiagnostics, onActions, onLoadError, onFocus, openServer],
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
      onMessage={onMessage}
      // Nothing in the editor should ever navigate the app away from itself.
      onShouldStartLoadWithRequest={request =>
        request.navigationType !== 'click'
      }
    />
  );
});

/**
 * `injectJavaScript` takes source, not data. JSON is very nearly a subset of
 * JS, and the two line separators are the whole of the difference: JSON allows
 * them raw inside a string, JS ends the line on them.
 */
function jsString(value) {
  return JSON.stringify(value === undefined ? null : value)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function editorHtml(file, sources) {
  const importMap = sources.importMap
    ? `<script type="importmap">${JSON.stringify(sources.importMap)}</script>`
    : '';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    ${importMap}
    <style>
      /* A transparent WKWebView still paints whatever the document paints,
         and the default UA background is white. */
      html, body, #container, #diff {
        margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden;
        background: transparent;
      }
      #diff { display: none; }
      .monaco-editor, .monaco-editor-background, .monaco-diff-editor { background: transparent; }

      /* WebKit rings the focused element in the system accent colour. Monaco
         keeps focus on a hidden textarea, so the ring only ever traces the
         editor's outer edge — it reads as a stray blue border. */
      :focus, :focus-visible { outline: none; }
      .monaco-editor .overflow-guard { outline: none; }

      /* Git changes in the gutter, the way VS Code draws them. */
      .git-added, .git-modified, .git-deleted {
        width: 3px !important; margin-left: 6px; border-radius: 1px;
      }
      .git-added { background: #2ea043; }
      .git-modified { background: #0078d4; }
      .git-deleted {
        background: transparent;
        border-bottom: 3px solid #f85149; height: 0 !important;
        top: -1px;
      }

      #status {
        position: absolute; right: 10px; bottom: 6px; font: 11px -apple-system, sans-serif;
        opacity: 0.6; pointer-events: none;
      }
    </style>
  </head>
  <body>
    <div id="container"></div>
    <div id="diff"></div>
    <script>
      var SOURCES = ${JSON.stringify(sources)};
      var CDN = ${JSON.stringify(MONACO_CDN)};
      var editor = null;
      var diffEditor = null;
      var theme = null;
      var pendingFile = null;
      var pendingOptions = null;
      var projectRoot = ${JSON.stringify(file.projectRoot ?? null)};
      var monacoBase = SOURCES.monaco;

      function post(message) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        }
      }

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

      // Absolute on disk, so a language server and the editor agree on what a
      // file is called, and so a definition in another file resolves to a path
      // the native side can open.
      function absolutePath(path) {
        if (!projectRoot) {
          return '/' + path;
        }
        return projectRoot.replace(/\\/$/, '') + '/' + path;
      }

      function fileUri(path) {
        return monaco.Uri.file(absolutePath(path));
      }

      function relativePath(uri) {
        var fsPath = uri.path || uri.fsPath || String(uri);
        if (projectRoot && fsPath.indexOf(projectRoot) === 0) {
          return fsPath.slice(projectRoot.length).replace(/^\\//, '');
        }
        return fsPath.replace(/^\\//, '');
      }

      // The two VS Code theme files, whole. Shiki reads its grammars off a CDN
      // or the file server, but a theme is the user's own file — it travels
      // with the document.
      var THEMES = ${JSON.stringify(THEMES)};

      // Each theme run through textmateThemeToMonacoTheme, once Shiki is up.
      // Until then Monaco is still tokenizing with Monarch, whose token names
      // no TextMate rule would have matched anyway.
      var converted = null;

      // Monaco's language services run in workers. Pulled straight off another
      // origin they would be cross-origin, so each worker is booted from a
      // data: URL that imports the real script instead.
      window.MonacoEnvironment = {
        getWorkerUrl: function () {
          return 'data:text/javascript;charset=utf-8,' + encodeURIComponent(
            "self.MonacoEnvironment = { baseUrl: '" + monacoBase + "/' };" +
            "importScripts('" + monacoBase + "/vs/base/worker/workerMain.js');"
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
      // again once Shiki has converted the TextMate rules the file carries.
      // Either way the app's own colours go on last.
      function applyTheme() {
        if (!window.monaco || !theme) {
          return;
        }

        var file = THEMES[theme.name];
        var next = converted && converted[theme.name];

        if (!next) {
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
      // finally have scopes to match. It is a WASM-backed ESM import: slower
      // to arrive than the editor is to boot, and allowed to fail — a miss
      // leaves Monarch in place, which is what the editor came with.
      async function startShiki() {
        try {
          var shiki = await import(SOURCES.shiki);
          var bridge = await import(SOURCES.shikiMonaco);
          var names = Object.keys(THEMES);

          var highlighter = await shiki.createHighlighter({
            themes: names.map(function (name) { return THEMES[name]; }),
            langs: ${JSON.stringify(SHIKI_LANGS)},
            langAlias: ${JSON.stringify(SHIKI_LANG_ALIAS)},
          });

          converted = {};
          names.forEach(function (name) {
            converted[name] = bridge.textmateThemeToMonacoTheme(
              highlighter.getTheme(name),
            );
          });

          bridge.shikiToMonaco(highlighter, monaco);
          applyTheme();
        } catch (error) {
          post({type: 'log', text: 'shiki unavailable: ' + (error && error.message)});
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
          var uri = path === UNTITLED ? undefined : fileUri(path);

          model =
            (uri && monaco.editor.getModel(uri)) ||
            monaco.editor.createModel(
              value,
              language || languageForPath(path) || 'plaintext',
              uri,
            );

          if (pendingOptions) {
            model.updateOptions({tabSize: pendingOptions.tabSize, insertSpaces: pendingOptions.insertSpaces});
          }

          models[path] = model;

          if (path !== UNTITLED) {
            lspDidOpen(model);
          }
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
          // pushEditOperations rather than setValue: the undo stack survives,
          // and the cursor stays roughly where it was.
          var full = model.getFullModelRange();
          model.pushEditOperations([], [{range: full, text: next.value}], function () { return null; });
        }

        var id = next.language || languageForPath(path);

        if (id && model.getLanguageId() !== id) {
          monaco.editor.setModelLanguage(model, id);
        }

        if (switching) {
          currentPath = path;
          if (diffEditor && diffVisible) {
            hideDiff();
          }
          editor.setModel(model);

          if (viewStates[path]) {
            editor.restoreViewState(viewStates[path]);
          }

          applyGitDecorations(path);
          postDiagnosticsFor(model);
        }
      };

      // All buffers belong to the project; a new project means new URIs, new
      // servers and no leftover models.
      window.setProject = function (root) {
        if (root === projectRoot) {
          return;
        }

        projectRoot = root;

        if (!window.monaco) {
          return;
        }

        Object.keys(models).forEach(function (path) {
          if (models[path] !== editor.getModel()) {
            models[path].dispose();
          }
        });

        var current = editor && editor.getModel();
        models = {};
        viewStates = {};
        gitChanges = {};

        if (current) {
          current.dispose();
          currentPath = null;
        }
      };

      window.setOptions = function (options) {
        pendingOptions = options;

        if (!editor) {
          return;
        }

        editor.updateOptions(options);
        if (diffEditor) {
          diffEditor.updateOptions(options);
        }
        monaco.editor.getModels().forEach(function (model) {
          model.updateOptions({tabSize: options.tabSize, insertSpaces: options.insertSpaces});
        });
      };

      window.revealPosition = function (line, column) {
        if (!editor) {
          return;
        }

        var position = {lineNumber: Math.max(1, line || 1), column: Math.max(1, column || 1)};
        editor.setPosition(position);
        editor.revealPositionInCenter(position, 0);
        editor.focus();
      };

      window.focusEditor = function () {
        if (editor) {
          editor.focus();
        }
      };

      window.openFind = function (term) {
        if (!editor) {
          return;
        }

        editor.focus();
        var action = editor.getAction('actions.find');
        if (action) {
          action.run();
        }
      };

      window.runAction = function (id) {
        if (!editor) {
          return;
        }

        editor.focus();
        var action = editor.getAction(id);
        if (action) {
          action.run();
        } else {
          editor.trigger('app', id, null);
        }
      };

      window.listActions = function () {
        if (!editor) {
          post({type: 'actions', actions: []});
          return;
        }

        post({
          type: 'actions',
          actions: editor.getSupportedActions().map(function (action) {
            return {id: action.id, label: action.label, alias: action.alias};
          }),
        });
      };

      // Format first when asked, then hand the buffer over. A language with no
      // formatter is common, so the format is allowed to do nothing — and it
      // is given a deadline, because a hung language server must not swallow
      // the save.
      window.requestSave = function (format) {
        if (!editor) {
          return;
        }

        var done = false;
        function finish() {
          if (done) {
            return;
          }
          done = true;
          post({type: 'save', path: filePath(), value: editor.getValue()});
        }

        if (!format) {
          finish();
          return;
        }

        var action = editor.getAction('editor.action.formatDocument');
        if (!action) {
          finish();
          return;
        }

        var timer = setTimeout(finish, 1500);
        Promise.resolve()
          .then(function () { return action.run(); })
          .catch(function () {})
          .then(function () { clearTimeout(timer); finish(); });
      };

      // ---- Git gutter --------------------------------------------------------

      var gitChanges = {};
      var gitDecorationIds = {};

      window.setGitChanges = function (path, changes) {
        gitChanges[path] = changes || [];
        if (path === currentPath) {
          applyGitDecorations(path);
        }
      };

      function applyGitDecorations(path) {
        var model = models[path];
        if (!model || model.isDisposed()) {
          return;
        }

        var decorations = (gitChanges[path] || []).map(function (change) {
          var start = Math.max(1, change.startLine);
          var end = Math.max(start, change.endLine);
          return {
            range: new monaco.Range(start, 1, end, 1),
            options: {
              isWholeLine: false,
              linesDecorationsClassName: 'git-' + change.kind,
              overviewRuler: {
                color: change.kind === 'added' ? '#2ea043' : change.kind === 'deleted' ? '#f85149' : '#0078d4',
                position: monaco.editor.OverviewRulerLane.Left,
              },
            },
          };
        });

        gitDecorationIds[path] = model.deltaDecorations(gitDecorationIds[path] || [], decorations);
      }

      // ---- Diff view ---------------------------------------------------------

      var diffVisible = false;
      var diffOriginalModel = null;

      window.showDiff = function (original) {
        if (!editor) {
          return;
        }

        var model = editor.getModel();
        if (!model) {
          return;
        }

        if (!diffEditor) {
          diffEditor = monaco.editor.createDiffEditor(document.getElementById('diff'), Object.assign(
            {},
            ${JSON.stringify(EDITOR_OPTIONS)},
            pendingOptions || {},
            {automaticLayout: true, renderSideBySide: true, originalEditable: false, readOnly: false, renderOverviewRuler: false}
          ));
        }

        if (diffOriginalModel) {
          diffOriginalModel.dispose();
        }

        diffOriginalModel = monaco.editor.createModel(original || '', model.getLanguageId());
        diffEditor.setModel({original: diffOriginalModel, modified: model});
        document.getElementById('container').style.display = 'none';
        document.getElementById('diff').style.display = 'block';
        diffVisible = true;
      };

      function hideDiff() {
        if (!diffVisible) {
          return;
        }

        document.getElementById('diff').style.display = 'none';
        document.getElementById('container').style.display = 'block';
        diffVisible = false;

        if (diffEditor) {
          diffEditor.setModel(null);
        }
        if (diffOriginalModel) {
          diffOriginalModel.dispose();
          diffOriginalModel = null;
        }
        if (editor) {
          editor.layout();
          editor.focus();
        }
      }

      window.hideDiff = hideDiff;

      // ---- App shortcuts -----------------------------------------------------

      // The app's own bindings, as [{key, metaKey, ctrlKey, altKey, shiftKey}].
      // Any of them pressed while the editor has focus is handed back rather
      // than swallowed. Only combinations with a modifier are taken on the
      // way down — a bare Escape belongs to whatever Monaco widget is open,
      // and is only handed back when nothing here wanted it.
      var appKeys = [];

      window.setAppKeys = function (keys) {
        appKeys = keys || [];
      };

      function keyMatches(binding, event) {
        return String(binding.key).toLowerCase() === String(event.key).toLowerCase() &&
          Boolean(binding.metaKey) === event.metaKey &&
          Boolean(binding.ctrlKey) === event.ctrlKey &&
          Boolean(binding.altKey) === event.altKey &&
          Boolean(binding.shiftKey) === event.shiftKey;
      }

      function keyMessage(event) {
        return {
          type: 'key',
          key: event.key,
          code: event.code,
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
        };
      }

      document.addEventListener('keydown', function (event) {
        var hasModifier = event.metaKey || event.ctrlKey || event.altKey;
        if (!hasModifier) {
          return;
        }

        for (var index = 0; index < appKeys.length; index++) {
          if (keyMatches(appKeys[index], event)) {
            event.preventDefault();
            event.stopPropagation();
            post(keyMessage(event));
            return;
          }
        }
      }, true);

      document.addEventListener('keydown', function (event) {
        if (event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) {
          return;
        }

        for (var index = 0; index < appKeys.length; index++) {
          if (keyMatches(appKeys[index], event)) {
            post(keyMessage(event));
            return;
          }
        }
      }, false);

      // ---- Diagnostics -------------------------------------------------------

      // Monaco's own workers (TypeScript, JSON, CSS) and the language servers
      // both end up as markers; whichever wrote them, the native side gets
      // the list for the Problems panel.
      function postDiagnosticsFor(model) {
        if (!model || model.isDisposed() || !model.uri || model.uri.scheme !== 'file') {
          return;
        }

        var markers = monaco.editor.getModelMarkers({resource: model.uri});
        post({
          type: 'diagnostics',
          path: relativePath(model.uri),
          diagnostics: markers.map(function (marker) {
            return {
              line: marker.startLineNumber,
              column: marker.startColumn,
              endLine: marker.endLineNumber,
              endColumn: marker.endColumn,
              message: marker.message,
              severity: marker.severity === monaco.MarkerSeverity.Error ? 'error'
                : marker.severity === monaco.MarkerSeverity.Warning ? 'warning'
                : marker.severity === monaco.MarkerSeverity.Info ? 'info' : 'hint',
              source: marker.source || marker.owner,
            };
          }),
        });
      }

      // ---- Language servers --------------------------------------------------

      // Monaco ships its own intelligence for these; a server is only asked
      // for when it has none.
      var BUILTIN = {typescript: 1, javascript: 1, css: 1, scss: 1, less: 1, html: 1, json: 1, plaintext: 1};
      var clients = {};

      function ensureClient(language) {
        if (!language || BUILTIN[language] || clients[language] || !projectRoot) {
          return;
        }

        clients[language] = {state: 'opening', nextId: 1, pending: {}, versions: {}, disposables: []};
        post({type: 'lspOpen', language: language});
      }

      window.resetLanguageServers = function () {
        Object.keys(clients).forEach(function (language) {
          clients[language].disposables.forEach(function (disposable) { disposable.dispose(); });
        });
        clients = {};
        if (window.monaco) {
          monaco.editor.getModels().forEach(function (model) {
            monaco.editor.setModelMarkers(model, 'lsp', []);
          });
        }
      };

      function lspSend(language, message) {
        post({type: 'lsp', language: language, body: JSON.stringify(message)});
      }

      function lspRequest(language, method, params) {
        var client = clients[language];
        if (!client) {
          return Promise.reject(new Error('no client'));
        }

        var id = client.nextId++;
        return new Promise(function (resolve, reject) {
          client.pending[id] = {resolve: resolve, reject: reject};
          lspSend(language, {jsonrpc: '2.0', id: id, method: method, params: params});
        });
      }

      function lspNotify(language, method, params) {
        lspSend(language, {jsonrpc: '2.0', method: method, params: params});
      }

      window.lspReady = function (language, server) {
        var client = clients[language];
        if (!client) {
          return;
        }

        client.state = 'initializing';
        client.server = server;

        lspRequest(language, 'initialize', {
          processId: null,
          clientInfo: {name: 'all-in-one', version: '1.0'},
          rootUri: fileUri('').toString(),
          rootPath: projectRoot,
          workspaceFolders: [{uri: fileUri('').toString(), name: projectRoot.split('/').pop()}],
          capabilities: {
            workspace: {workspaceFolders: true, configuration: false, applyEdit: false},
            textDocument: {
              synchronization: {didSave: true, willSave: false},
              hover: {contentFormat: ['markdown', 'plaintext']},
              completion: {completionItem: {snippetSupport: true, documentationFormat: ['markdown', 'plaintext']}, contextSupport: true},
              signatureHelp: {signatureInformation: {documentationFormat: ['markdown', 'plaintext']}},
              definition: {},
              references: {},
              documentSymbol: {hierarchicalDocumentSymbolSupport: true},
              formatting: {},
              rangeFormatting: {},
              rename: {prepareSupport: false},
              publishDiagnostics: {relatedInformation: false},
              codeAction: {},
            },
          },
          initializationOptions: {},
        }).then(function (result) {
          client.capabilities = (result && result.capabilities) || {};
          client.state = 'ready';
          lspNotify(language, 'initialized', {});
          registerProviders(language);

          monaco.editor.getModels().forEach(function (model) {
            if (model.getLanguageId() === language && model.uri.scheme === 'file') {
              lspDidOpen(model);
            }
          });
        }).catch(function () {
          client.state = 'unavailable';
        });
      };

      window.lspUnavailable = function (language) {
        if (clients[language]) {
          clients[language].state = 'unavailable';
        } else {
          clients[language] = {state: 'unavailable', nextId: 1, pending: {}, versions: {}, disposables: []};
        }
      };

      window.lspReceive = function (language, body) {
        var client = clients[language];
        if (!client) {
          return;
        }

        var message;
        try {
          message = JSON.parse(body);
        } catch (error) {
          return;
        }

        if (message.id != null && client.pending[message.id]) {
          var waiting = client.pending[message.id];
          delete client.pending[message.id];
          if (message.error) {
            waiting.reject(message.error);
          } else {
            waiting.resolve(message.result);
          }
          return;
        }

        if (message.method === 'textDocument/publishDiagnostics') {
          applyLspDiagnostics(message.params);
          return;
        }

        // Requests from the server we have no answer to get an empty one, so
        // it does not sit waiting.
        if (message.method && message.id != null) {
          var result = null;
          if (message.method === 'workspace/configuration') {
            result = (message.params.items || []).map(function () { return null; });
          }
          if (message.method === 'client/registerCapability' || message.method === 'client/unregisterCapability' || message.method === 'window/workDoneProgress/create') {
            result = null;
          }
          if (message.method === 'workspace/workspaceFolders') {
            result = [{uri: fileUri('').toString(), name: 'project'}];
          }
          lspSend(language, {jsonrpc: '2.0', id: message.id, result: result});
        }
      };

      function lspDidOpen(model) {
        var language = model.getLanguageId();
        ensureClient(language);
        var client = clients[language];

        if (!client || client.state !== 'ready') {
          return;
        }

        var uri = model.uri.toString();
        if (client.versions[uri] != null) {
          return;
        }

        client.versions[uri] = 1;
        lspNotify(language, 'textDocument/didOpen', {
          textDocument: {uri: uri, languageId: language, version: 1, text: model.getValue()},
        });
      }

      function lspDidChange(model) {
        var language = model.getLanguageId();
        var client = clients[language];
        if (!client || client.state !== 'ready') {
          return;
        }

        var uri = model.uri.toString();
        if (client.versions[uri] == null) {
          lspDidOpen(model);
          return;
        }

        client.versions[uri]++;
        lspNotify(language, 'textDocument/didChange', {
          textDocument: {uri: uri, version: client.versions[uri]},
          contentChanges: [{text: model.getValue()}],
        });
      }

      function lspDidSave(model) {
        var language = model.getLanguageId();
        var client = clients[language];
        if (!client || client.state !== 'ready' || client.versions[model.uri.toString()] == null) {
          return;
        }
        lspNotify(language, 'textDocument/didSave', {textDocument: {uri: model.uri.toString()}, text: model.getValue()});
      }

      var LSP_SEVERITY = {1: 8, 2: 4, 3: 2, 4: 1};

      function applyLspDiagnostics(params) {
        var model = monaco.editor.getModel(monaco.Uri.parse(params.uri));
        if (!model) {
          return;
        }

        monaco.editor.setModelMarkers(model, 'lsp', (params.diagnostics || []).map(function (diagnostic) {
          return {
            startLineNumber: diagnostic.range.start.line + 1,
            startColumn: diagnostic.range.start.character + 1,
            endLineNumber: diagnostic.range.end.line + 1,
            endColumn: diagnostic.range.end.character + 1,
            message: diagnostic.message,
            severity: LSP_SEVERITY[diagnostic.severity] || 8,
            source: diagnostic.source,
            code: diagnostic.code != null ? String(diagnostic.code) : undefined,
          };
        }));
      }

      function toLspPosition(position) {
        return {line: position.lineNumber - 1, character: position.column - 1};
      }

      function toRange(range) {
        return new monaco.Range(range.start.line + 1, range.start.character + 1, range.end.line + 1, range.end.character + 1);
      }

      function toLocation(location) {
        var uri = location.targetUri || location.uri;
        var range = location.targetSelectionRange || location.targetRange || location.range;
        return {uri: monaco.Uri.parse(uri), range: toRange(range)};
      }

      function textDocument(model) {
        return {uri: model.uri.toString()};
      }

      function markdown(contents) {
        if (!contents) {
          return [];
        }
        var list = Array.isArray(contents) ? contents : [contents];
        return list.map(function (item) {
          if (typeof item === 'string') {
            return {value: item};
          }
          if (item.language) {
            return {value: '\`\`\`' + item.language + '\\n' + item.value + '\\n\`\`\`'};
          }
          return {value: item.value || ''};
        });
      }

      var COMPLETION_KIND = {
        1: 18, 2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 7, 9: 8, 10: 9, 11: 12, 12: 13, 13: 15, 14: 17,
        15: 27, 16: 19, 17: 20, 18: 21, 19: 23, 20: 16, 21: 14, 22: 6, 23: 10, 24: 11, 25: 24,
      };

      function registerProviders(language) {
        var client = clients[language];
        var capabilities = client.capabilities || {};
        var disposables = client.disposables;

        if (capabilities.hoverProvider) {
          disposables.push(monaco.languages.registerHoverProvider(language, {
            provideHover: function (model, position) {
              return lspRequest(language, 'textDocument/hover', {
                textDocument: textDocument(model), position: toLspPosition(position),
              }).then(function (result) {
                if (!result || !result.contents) {
                  return null;
                }
                return {contents: markdown(result.contents), range: result.range ? toRange(result.range) : undefined};
              }).catch(function () { return null; });
            },
          }));
        }

        if (capabilities.completionProvider) {
          disposables.push(monaco.languages.registerCompletionItemProvider(language, {
            triggerCharacters: capabilities.completionProvider.triggerCharacters || [],
            provideCompletionItems: function (model, position, context) {
              var word = model.getWordUntilPosition(position);
              var defaultRange = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);

              return lspRequest(language, 'textDocument/completion', {
                textDocument: textDocument(model),
                position: toLspPosition(position),
                context: {triggerKind: context.triggerKind === 1 ? 2 : 1, triggerCharacter: context.triggerCharacter},
              }).then(function (result) {
                var items = Array.isArray(result) ? result : (result && result.items) || [];
                return {
                  incomplete: Boolean(result && result.isIncomplete),
                  suggestions: items.map(function (item) {
                    var edit = item.textEdit;
                    var range = defaultRange;
                    var insertText = item.insertText || item.label;

                    if (edit) {
                      insertText = edit.newText;
                      range = toRange(edit.range || edit.insert);
                    }

                    return {
                      label: typeof item.label === 'string' ? item.label : item.label.label,
                      kind: COMPLETION_KIND[item.kind] || 18,
                      detail: item.detail,
                      documentation: item.documentation ? markdown(item.documentation)[0] : undefined,
                      insertText: insertText,
                      insertTextRules: item.insertTextFormat === 2 ? 4 : 0,
                      range: range,
                      sortText: item.sortText,
                      filterText: item.filterText,
                      additionalTextEdits: (item.additionalTextEdits || []).map(function (extra) {
                        return {range: toRange(extra.range), text: extra.newText};
                      }),
                    };
                  }),
                };
              }).catch(function () { return {suggestions: []}; });
            },
          }));
        }

        if (capabilities.definitionProvider) {
          disposables.push(monaco.languages.registerDefinitionProvider(language, {
            provideDefinition: function (model, position) {
              return lspRequest(language, 'textDocument/definition', {
                textDocument: textDocument(model), position: toLspPosition(position),
              }).then(function (result) {
                if (!result) {
                  return [];
                }
                return (Array.isArray(result) ? result : [result]).map(toLocation);
              }).catch(function () { return []; });
            },
          }));
        }

        if (capabilities.referencesProvider) {
          disposables.push(monaco.languages.registerReferenceProvider(language, {
            provideReferences: function (model, position) {
              return lspRequest(language, 'textDocument/references', {
                textDocument: textDocument(model), position: toLspPosition(position), context: {includeDeclaration: true},
              }).then(function (result) {
                return (result || []).map(toLocation);
              }).catch(function () { return []; });
            },
          }));
        }

        if (capabilities.documentSymbolProvider) {
          disposables.push(monaco.languages.registerDocumentSymbolProvider(language, {
            provideDocumentSymbols: function (model) {
              return lspRequest(language, 'textDocument/documentSymbol', {
                textDocument: textDocument(model),
              }).then(function (result) {
                function convert(symbol) {
                  var range = symbol.location ? symbol.location.range : symbol.range;
                  var selection = symbol.selectionRange || range;
                  return {
                    name: symbol.name,
                    detail: symbol.detail || '',
                    kind: Math.max(0, (symbol.kind || 1) - 1),
                    tags: [],
                    range: toRange(range),
                    selectionRange: toRange(selection),
                    children: (symbol.children || []).map(convert),
                  };
                }
                return (result || []).map(convert);
              }).catch(function () { return []; });
            },
          }));
        }

        if (capabilities.documentFormattingProvider) {
          disposables.push(monaco.languages.registerDocumentFormattingEditProvider(language, {
            provideDocumentFormattingEdits: function (model, options) {
              return lspRequest(language, 'textDocument/formatting', {
                textDocument: textDocument(model),
                options: {tabSize: options.tabSize, insertSpaces: options.insertSpaces},
              }).then(function (result) {
                return (result || []).map(function (edit) {
                  return {range: toRange(edit.range), text: edit.newText};
                });
              }).catch(function () { return []; });
            },
          }));
        }

        if (capabilities.renameProvider) {
          disposables.push(monaco.languages.registerRenameProvider(language, {
            provideRenameEdits: function (model, position, newName) {
              return lspRequest(language, 'textDocument/rename', {
                textDocument: textDocument(model), position: toLspPosition(position), newName: newName,
              }).then(function (result) {
                var edits = [];
                var changes = (result && result.changes) || {};
                Object.keys(changes).forEach(function (uri) {
                  changes[uri].forEach(function (edit) {
                    edits.push({resource: monaco.Uri.parse(uri), versionId: undefined, textEdit: {range: toRange(edit.range), text: edit.newText}});
                  });
                });
                ((result && result.documentChanges) || []).forEach(function (change) {
                  if (!change.textDocument) {
                    return;
                  }
                  change.edits.forEach(function (edit) {
                    edits.push({resource: monaco.Uri.parse(change.textDocument.uri), versionId: undefined, textEdit: {range: toRange(edit.range), text: edit.newText}});
                  });
                });
                return {edits: edits};
              }).catch(function (error) {
                return {edits: [], rejectReason: error && error.message};
              });
            },
          }));
        }

        if (capabilities.signatureHelpProvider) {
          disposables.push(monaco.languages.registerSignatureHelpProvider(language, {
            signatureHelpTriggerCharacters: capabilities.signatureHelpProvider.triggerCharacters || ['(', ','],
            provideSignatureHelp: function (model, position) {
              return lspRequest(language, 'textDocument/signatureHelp', {
                textDocument: textDocument(model), position: toLspPosition(position),
              }).then(function (result) {
                if (!result) {
                  return null;
                }
                return {
                  value: {
                    signatures: (result.signatures || []).map(function (signature) {
                      return {
                        label: signature.label,
                        documentation: signature.documentation ? markdown(signature.documentation)[0] : undefined,
                        parameters: (signature.parameters || []).map(function (parameter) {
                          return {label: parameter.label, documentation: parameter.documentation ? markdown(parameter.documentation)[0] : undefined};
                        }),
                      };
                    }),
                    activeSignature: result.activeSignature || 0,
                    activeParameter: result.activeParameter || 0,
                  },
                  dispose: function () {},
                };
              }).catch(function () { return null; });
            },
          }));
        }
      }

      // ---- Boot --------------------------------------------------------------

      function loadScript(src, onload, onerror) {
        var script = document.createElement('script');
        script.src = src;
        script.onload = onload;
        script.onerror = onerror;
        document.head.appendChild(script);
      }

      function boot() {
        require.config({paths: {vs: monacoBase + '/vs'}});
        require(['vs/editor/editor.main'], function () {
          // Registered before Shiki, which pairs its grammars against whichever
          // modes exist at the moment it runs.
          ${JSON.stringify(EXTRA_LANGUAGES)}.forEach(function (language) {
            monaco.languages.register(language);
          });

          // No model of its own: every buffer this editor shows is one setFile
          // created against a URI, and an implicit one would only be orphaned
          // by the first switch.
          editor = monaco.editor.create(document.getElementById('container'), Object.assign(
            ${JSON.stringify(EDITOR_OPTIONS)},
            pendingOptions || {},
            {model: null}
          ));

          applyTheme();

          // A definition that lands in another file: Monaco asks its editor
          // service to open it, and that is the native side's job.
          monaco.editor.registerEditorOpener({
            openCodeEditor: function (source, resource, selectionOrPosition) {
              if (resource.scheme !== 'file') {
                return false;
              }
              var line = 1;
              var column = 1;
              if (selectionOrPosition) {
                line = selectionOrPosition.startLineNumber || selectionOrPosition.lineNumber || 1;
                column = selectionOrPosition.startColumn || selectionOrPosition.column || 1;
              }
              post({type: 'openFile', path: relativePath(resource), line: line, column: column});
              return true;
            },
          });

          // Whatever the native side asked for while the loader was still
          // running, or the file the document was built around if it asked
          // for nothing.
          window.setFile(pendingFile || ${JSON.stringify({path: file.path, value: file.value, language: file.language})});
          pendingFile = null;

          // Bound after the first file, so opening one is not itself a change.
          // The listener is the editor's rather than the model's, so it
          // follows whichever model is attached.
          editor.onDidChangeModelContent(function () {
            post({type: 'change', path: filePath(), value: editor.getValue()});
            var model = editor.getModel();
            if (model && model.uri.scheme === 'file') {
              lspDidChange(model);
            }
          });

          editor.onDidFocusEditorText(function () {
            post({type: 'focus'});
          });

          var cursorTimer = null;
          editor.onDidChangeCursorPosition(function (event) {
            clearTimeout(cursorTimer);
            cursorTimer = setTimeout(function () {
              var model = editor.getModel();
              post({
                type: 'cursor',
                line: event.position.lineNumber,
                column: event.position.column,
                path: filePath(),
                language: model ? model.getLanguageId() : null,
              });
            }, 50);
          });

          // Clicking away — into the file tree, or out of the window — is a
          // save. The native side drops the write if nothing has changed, so
          // this is free when the editor is only being tabbed through.
          editor.onDidBlurEditorText(function () {
            post({type: 'save', path: filePath(), value: editor.getValue(), blur: true});
            var model = editor.getModel();
            if (model && model.uri.scheme === 'file') {
              lspDidSave(model);
            }
          });

          monaco.editor.onDidChangeMarkers(function (uris) {
            uris.forEach(function (uri) {
              postDiagnosticsFor(monaco.editor.getModel(uri));
            });
          });

          monaco.editor.onWillDisposeModel(function (model) {
            var language = model.getLanguageId();
            var client = clients[language];
            if (client && client.state === 'ready' && client.versions[model.uri.toString()] != null) {
              delete client.versions[model.uri.toString()];
              lspNotify(language, 'textDocument/didClose', {textDocument: {uri: model.uri.toString()}});
            }
          });

          post({type: 'ready'});

          startShiki();
        });
      }

      loadScript(monacoBase + '/vs/loader.js', boot, function () {
        if (monacoBase === CDN) {
          post({type: 'loadError', source: monacoBase});
          return;
        }
        monacoBase = CDN;
        loadScript(CDN + '/vs/loader.js', boot, function () {
          post({type: 'loadError', source: CDN});
        });
      });
    </script>
  </body>
</html>`;
}

const createStyles = colors => StyleSheet.create({
  editor: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 16,
  },
});
