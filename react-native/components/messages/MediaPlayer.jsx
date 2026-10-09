import React from 'react';
import {WebView} from 'react-native-webview';

/**
 * Plays a video or audio attachment with the system's own HTML5 controls.
 *
 * There's no native video module in this app, but WebKit's player is already
 * linked through react-native-webview and handles every codec WhatsApp sends.
 * Videos report their real size back so the bubble can match it.
 */
export function MediaPlayer({uri, kind, style, onAspectRatio}) {
  const tag = kind === 'video' ? 'video' : 'audio';
  const html = `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;background:transparent;overflow:hidden}
${tag}{display:block;width:100%;height:100%;object-fit:contain;background:${tag === 'video' ? '#000' : 'transparent'}}</style>
</head><body>
<${tag} src="${uri}" controls playsinline preload="metadata"></${tag}>
<script>
  var el = document.querySelector('${tag}');
  el.addEventListener('loadedmetadata', function () {
    if (el.videoWidth && el.videoHeight) window.ReactNativeWebView.postMessage(String(el.videoWidth / el.videoHeight));
  });
</script>
</body></html>`;

  return (
    <WebView
      style={[{backgroundColor: 'transparent'}, style]}
      source={{html}}
      originWhitelist={['*']}
      scrollEnabled={false}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction
      onMessage={({nativeEvent}) => onAspectRatio?.(Number(nativeEvent.data))}
    />
  );
}
