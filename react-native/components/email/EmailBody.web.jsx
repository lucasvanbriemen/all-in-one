import React from 'react';

/**
 * Web stand-in for the native WebView body.
 *
 * `react-native-webview` has no web implementation, and a static import would
 * fail the Vite build — resolving this file ahead of `EmailBody.jsx` keeps it
 * off the web bundle entirely. An iframe is the direct equivalent here, and
 * mirrors what the Rails app renders: internal emails load by URL, external
 * ones go into a sandboxed `srcdoc`.
 */
export function EmailBody({detail}) {
  const style = {flex: 1, border: 'none', width: '100%'};

  if (detail.internal) {
    return <iframe src={detail.html_body} style={style} title="Email body" />;
  }

  return (
    <iframe
      srcDoc={detail.html_body}
      sandbox="allow-scripts allow-top-navigation allow-forms"
      style={style}
      title="Email body"
    />
  );
}
