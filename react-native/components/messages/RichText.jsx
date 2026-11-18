import {Linking, Platform, StyleSheet, Text, View} from 'react-native';
import React from 'react';
import {useThemedStyles, withAlpha} from '../theme';

const MONO = Platform.select({ios: 'Menlo', macos: 'Menlo', default: 'monospace'});

// Inline formats shared by Slack mrkdwn and WhatsApp (plus Markdown's **bold**).
// Emphasis needs non-space edges, so a correction like "Ver*" stays plain text.
const INLINE = new RegExp([
  '`(?<code>[^`\\n]+)`',
  '<(?<href>(?:https?|mailto):[^|>\\s]+)(?:\\|(?<label>[^>]+))?>',
  '(?<url>https?:\\/\\/[^\\s<>]*[^\\s<>.,!?;:)\'"])',
  '\\*\\*(?<bold2>\\S(?:.*?\\S)?)\\*\\*',
  '\\*(?<bold>\\S(?:[^*\\n]*?\\S)?)\\*',
  '_(?<italic>\\S(?:[^_\\n]*?\\S)?)_',
  '~~?(?<strike>\\S(?:[^~\\n]*?\\S)?)~~?',
].join('|'), 'g');

const EMPHASIS = ['bold2', 'bold', 'italic', 'strike'];

// "*a*b" or "snake_case_name" shouldn't format: markers sit at word edges.
function atWordEdges(text, start, end) {
  const before = text[start - 1];
  const after = text[end];
  return (!before || /[\s([{"'“‘]/.test(before)) && (!after || /[\s)\]}.,!?:;"'”’]/.test(after));
}

function decode(text, slack) {
  return slack ? text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') : text;
}

function inline(text, ctx, keyPrefix = '') {
  const nodes = [];
  let cursor = 0;
  INLINE.lastIndex = 0;
  let match;

  while ((match = INLINE.exec(text))) {
    const {groups} = match;
    const start = match.index;
    const end = start + match[0].length;
    const emphasis = EMPHASIS.find(name => groups[name] != null);

    if (emphasis && !atWordEdges(text, start, end)) {
      INLINE.lastIndex = start + 1;
      continue;
    }

    if (start > cursor) nodes.push(decode(text.slice(cursor, start), ctx.slack));
    const key = `${keyPrefix}${start}`;
    const {styles} = ctx;

    if (groups.code != null) {
      nodes.push(<Text key={key} style={styles.inlineCode}>{decode(groups.code, ctx.slack)}</Text>);
    } else if (groups.href != null || groups.url != null) {
      const href = groups.href ?? groups.url;
      nodes.push(
        <Text key={key} style={styles.link} onPress={() => Linking.openURL(href)}>
          {decode(groups.label ?? href, ctx.slack)}
        </Text>
      );
    } else {
      const inner = groups[emphasis];
      const style = emphasis === 'italic' ? styles.italic : emphasis === 'strike' ? styles.strike : styles.bold;
      // Recurse so *_bold italic_* nests. lastIndex is shared, so restore it afterwards.
      nodes.push(<Text key={key} style={style}>{inline(inner, ctx, `${key}-`)}</Text>);
      INLINE.lastIndex = end;
    }

    cursor = end;
  }

  if (cursor < text.length) nodes.push(decode(text.slice(cursor), ctx.slack));
  return nodes;
}

// Splits out ``` blocks (shown as boxes) and > quote lines; the rest renders inline.
function blocks(text) {
  const result = [];
  text.split(/```\n?([\s\S]*?)\n?```/).forEach((part, index) => {
    if (index % 2 === 1) return result.push({type: 'code', text: part});
    if (!part) return;

    let paragraph = [];
    let quote = [];
    const flush = () => {
      if (paragraph.length) result.push({type: 'text', text: paragraph.join('\n')});
      if (quote.length) result.push({type: 'quote', text: quote.join('\n')});
      paragraph = [];
      quote = [];
    };

    part.split('\n').forEach(line => {
      const quoted = line.match(/^(?:>|&gt;) ?(.*)$/);
      if (quoted) {
        if (paragraph.length) flush();
        quote.push(quoted[1]);
      } else {
        if (quote.length) flush();
        paragraph.push(line);
      }
    });
    flush();
  });

  // Trim the blank lines a code block or quote leaves around the text.
  return result
    .map(block => block.type === 'text' ? {...block, text: block.text.replace(/^\n+|\n+$/g, '')} : block)
    .filter(block => block.type !== 'text' || block.text);
}

export function RichText({text, platform, style}) {
  const styles = useThemedStyles(createStyles);
  if (!text) return null;

  const ctx = {styles, slack: platform === 'slack'};
  const parts = blocks(text);

  // Plain messages stay a single Text so selection and layout match what was there before.
  if (parts.length === 1 && parts[0].type === 'text') {
    return <Text style={style}>{inline(parts[0].text, ctx)}</Text>;
  }

  return (
    <View style={styles.stack}>
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <View key={index} style={styles.codeBlock}>
              <Text style={[style, styles.codeText]}>{decode(part.text, ctx.slack)}</Text>
            </View>
          );
        }
        if (part.type === 'quote') {
          return (
            <View key={index} style={styles.quote}>
              <Text style={style}>{inline(part.text, ctx, `${index}-`)}</Text>
            </View>
          );
        }
        return <Text key={index} style={style}>{inline(part.text, ctx, `${index}-`)}</Text>;
      })}
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  stack: {
    gap: 6,
    flexShrink: 1,
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  strike: {
    textDecorationLine: 'line-through',
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  inlineCode: {
    fontFamily: MONO,
    fontSize: 13,
    backgroundColor: withAlpha(colors.onSurface, 0.1),
  },
  codeBlock: {
    backgroundColor: withAlpha(colors.onSurface, 0.08),
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  codeText: {
    fontFamily: MONO,
    fontSize: 13,
  },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.outline,
    paddingLeft: 8,
  },
});
