import {
  TERMINAL_OPTIONS,
  XTERM_CDN,
  XTERM_FIT_CDN,
  terminalTheme,
} from './terminalTheme';
import {useCallback, useEffect, useRef, useState} from 'react';

import {StyleSheet} from 'react-native';
import {WebView} from 'react-native-webview';
import {fileSystem} from '../fileSystem';
import {useColorScheme} from 'react-native';
import {useTheme} from '../theme';

/**
 * xterm.js, hosted in a WebView, over a pty on the file server.
 *
 * Same split as `CodeEditor`: a terminal emulator is thousands of DOM nodes and
 * a canvas, neither of which the native renderer has a view config for, so it
 * runs in the only DOM the app has and is driven through `injectJavaScript`.
 *
 * The socket, though, is dialled from *this* side rather than from the page.
 * The document is served with the CDN as its base URL — the same trick that
 * makes the loader script same-origin — which makes it a secure context, and a
 * secure context may not open an insecure socket. `ws://127.0.0.1` from inside
 * the frame is blocked as mixed content; from React Native it is just a socket.
 * So the page is the screen and the keyboard, and nothing else.
 */
export function Terminal({projectRoot, onSearch, style}) {
  const colors = useTheme();
  const scheme = useColorScheme() ?? 'light';

  const webView = useRef(null);
  const socket = useRef(null);
  const [loaded, setLoaded] = useState(false);

  // What the page last measured it could fit. It is also the gate on dialling
  // at all: the shell is spawned at a size, so it is spawned at the real one
  // rather than at 80x24 and reflowed a frame later.
  const size = useRef(null);

  // The document is built exactly once — a `source` that changed identity would
  // reload the frame and take the scrollback with it.
  const source = useRef(null);
  source.current ??= {
    html: terminalHtml(terminalTheme(colors, scheme)),
    baseUrl: `${XTERM_CDN}/`,
  };

  const inject = useCallback(script => {
    webView.current?.injectJavaScript(`${script} true;`);
  }, []);

  const send = useCallback(message => {
    if (socket.current?.readyState !== 1) {
      return;
    }

    socket.current.send(JSON.stringify(message));
  }, []);

  const connect = useCallback(() => {
    // Detached before it is closed. Hanging the far side up makes the shell
    // report its own exit, and that notice belongs to the panel being replaced
    // rather than to the one replacing it — which is the only one still here to
    // receive it.
    const previous = socket.current;

    if (previous) {
      previous.onmessage = null;
      previous.onerror = null;
      previous.onclose = null;
      previous.close();
    }

    const next = new WebSocket(
      fileSystem.terminalUrl(projectRoot, size.current),
    );
    socket.current = next;

    // The size travels in the URL so the shell starts out right, and again here
    // because the panel may have been dragged while the socket was opening.
    next.onopen = () => send({type: 'resize', ...size.current});

    next.onmessage = event => {
      const message = JSON.parse(event.data);

      if (message.type === 'output') {
        inject(`window.write(${jsString(message.data)});`);
      }

      if (message.type === 'exit') {
        inject(`window.notice(${jsString('[shell exited — press any key]')});`);
      }
    };

    next.onerror = () => {
      inject(`window.notice(${jsString('[no terminal — is the file server up?]')});`);
    };

    // Cleared rather than reconnected: a shell is only ever spawned because
    // somebody asked for one, and `onMessage` reads this to know to ask again.
    next.onclose = () => {
      if (socket.current === next) {
        socket.current = null;
      }
    };
  }, [projectRoot, inject, send]);

  const onMessage = useCallback(
    event => {
      const message = JSON.parse(event.nativeEvent.data);

      if (message.type === 'size') {
        const first = !size.current;
        size.current = {cols: message.cols, rows: message.rows};

        // The first measurement is what the shell is spawned from; every one
        // after it is a window the shell already has being resized.
        if (first || !socket.current) {
          connect();
        } else {
          send({type: 'resize', ...size.current});
        }
      }

      if (message.type === 'input') {
        // Typing into a shell that has exited is how the next one is asked for.
        if (!socket.current) {
          inject('window.reset();');
          connect();
          return;
        }

        send({type: 'input', data: message.data});
      }

      // Cmd+P is the app's, not the shell's — same hand-back as the editor.
      if (message.type === 'search') {
        onSearch?.();
      }
    },
    [connect, send, inject, onSearch],
  );

  // The palette arrives from a fetch, so it is pushed in rather than being the
  // one baked into the document — which was only ever the fallback set.
  useEffect(() => {
    if (!loaded) {
      return;
    }

    inject(`window.setTheme(${JSON.stringify(terminalTheme(colors, scheme))});`);
  }, [loaded, inject, colors, scheme]);

  // A shell's cwd is fixed when it is spawned, so opening another project means
  // another shell — writing a `cd` into whatever is running is not the same
  // thing, and would land in the middle of it.
  const root = useRef(projectRoot);
  useEffect(() => {
    if (root.current === projectRoot) {
      return;
    }

    root.current = projectRoot;

    // Nothing to reconnect until the page has measured itself; the first dial
    // will pick the new root up on its own.
    if (!size.current) {
      return;
    }

    inject('window.reset();');
    connect();
  }, [projectRoot, connect, inject]);

  // Closing the socket is what hangs the shell up — the server sends SIGHUP on
  // the far side. Without this, navigating off the code page leaves it running.
  useEffect(() => () => socket.current?.close(), []);

  return (
    <WebView
      ref={webView}
      style={[styles.terminal, style]}
      source={source.current}
      originWhitelist={['*']}
      // As in `CodeEditor`: `WebView.styles` sets an opaque white fill, and on
      // macOS `drawsBackground` follows the alpha it is handed — anything
      // opaque here becomes a slab over the window's blur.
      opaque={false}
      backgroundColor="transparent"
      onLoadEnd={() => setLoaded(true)}
      onMessage={onMessage}
      onShouldStartLoadWithRequest={request =>
        request.navigationType !== 'click'
      }
    />
  );
}

/**
 * `injectJavaScript` takes source, not data. JSON is very nearly a subset of
 * JS, and the two line separators are the whole of the difference: JSON allows
 * them raw inside a string, JS ends the line on them. Shell output is arbitrary
 * bytes, so it is exactly the place they turn up.
 */
function jsString(value) {
  return JSON.stringify(value)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function terminalHtml(theme) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <link rel="stylesheet" href="${XTERM_CDN}/css/xterm.css" />
    <style>
      /* A transparent WKWebView still paints whatever the document paints. */
      html, body, #terminal {
        margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden;
        background: transparent;
      }

      #terminal { padding: 8px; box-sizing: border-box; }

      /* xterm fills the viewport with #000 so that on macOS the scrollbar is
         drawn fully opaque. The panel is glass, so the scrollbar loses. */
      .xterm .xterm-viewport { background-color: transparent !important; }

      /* WebKit rings the focused element in the system accent colour, and
         xterm keeps focus on a hidden textarea — the ring only ever traces the
         panel's own edge. */
      :focus, :focus-visible { outline: none; }

      .xterm-viewport::-webkit-scrollbar { width: 8px; }
      .xterm-viewport::-webkit-scrollbar-track { background: transparent; }
      .xterm-viewport::-webkit-scrollbar-thumb {
        background: rgba(127, 127, 127, 0.4); border-radius: 4px;
      }
    </style>
  </head>
  <body>
    <div id="terminal"></div>
    <script src="${XTERM_CDN}/lib/xterm.js"></script>
    <script src="${XTERM_FIT_CDN}/lib/addon-fit.js"></script>
    <script>
      var term = new Terminal(Object.assign(
        ${JSON.stringify(TERMINAL_OPTIONS)},
        {theme: ${JSON.stringify(theme)}}
      ));

      var fit = new FitAddon.FitAddon();
      term.loadAddon(fit);
      term.open(document.getElementById('terminal'));

      function post(message) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        }
      }

      // Everything the pty writes, and the two things the native side says
      // itself. A notice is dimmed so it reads as the app talking rather than
      // as something the shell printed.
      window.write = function (data) { term.write(data); };
      window.notice = function (text) { term.write('\\r\\n\\x1b[2m' + text + '\\x1b[0m\\r\\n'); };
      window.reset = function () { term.reset(); };
      window.setTheme = function (theme) { term.options.theme = theme; };

      // Cell size is what decides cols and rows, so the pty is only told a
      // size the emulator has actually settled on. Reporting the same one
      // twice would resize a shell that is already that shape.
      var reported = '';
      function report() {
        try { fit.fit(); } catch (error) { return; }

        var size = term.cols + 'x' + term.rows;

        if (size === reported) {
          return;
        }

        reported = size;
        post({type: 'size', cols: term.cols, rows: term.rows});
      }

      term.onData(function (data) { post({type: 'input', data: data}); });

      // Returning false leaves the key to us. Only Cmd+P is taken: every other
      // Cmd combination has to fall through to WebKit, which is what makes
      // Cmd+C and Cmd+V work — xterm copies and pastes off the DOM events the
      // browser fires, not off the keystrokes.
      term.attachCustomKeyEventHandler(function (event) {
        if (event.type === 'keydown' && event.metaKey && event.key === 'p') {
          event.preventDefault();
          post({type: 'search'});
          return false;
        }

        return true;
      });

      // Observed on the body: the panel is laid out by flex on the native side,
      // and fitting changes only what is inside #terminal, so this cannot feed
      // back into itself.
      new ResizeObserver(report).observe(document.body);

      // The first fit is measured against whichever font was resolved for it,
      // and Menlo is not guaranteed to have been by the time the frame loads.
      if (document.fonts) {
        document.fonts.ready.then(report);
      }

      report();
    </script>
  </body>
</html>`;
}

const styles = StyleSheet.create({
  terminal: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 16,
  },
});
