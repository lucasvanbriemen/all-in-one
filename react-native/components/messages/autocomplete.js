import {api} from '../api';

// Both lists are fetched once per app session; every composer shares them.
let emojiPromise = null;
let contactsPromise = null;

// {name: "😂"} for standard emoji, {name: "https://..."} for Slack workspace emoji.
export function loadEmoji() {
  emojiPromise ??= api.getOrThrow('/slack/emoji').catch(error => {
    emojiPromise = null;
    throw error;
  });
  return emojiPromise;
}

export function loadContacts() {
  contactsPromise ??= api.getOrThrow('/slack/contacts').catch(error => {
    contactsPromise = null;
    throw error;
  });
  return contactsPromise;
}

export const isCustomEmoji = value => value.startsWith('http');

// The "@car" or ":jo" being typed just before the cursor. Emoji wait for two
// letters so "note:" or a time doesn't pop up a list.
export function tokenAt(text, cursor) {
  const match = text.slice(0, cursor).match(/(^|\s)([@:])([\w.\-+']*)$/);
  if (!match) return null;
  const [, , trigger, query] = match;
  if (trigger === ':' && query.length < 2) return null;
  return {trigger, query, start: cursor - query.length - 1, end: cursor};
}

const LIMIT = 8;

// Prefix matches first, then names that merely contain the query.
function rank(items, query, nameOf) {
  const q = query.toLowerCase();
  const starts = [];
  const contains = [];
  for (const item of items) {
    const name = nameOf(item).toLowerCase();
    if (name.startsWith(q)) starts.push(item);
    else if (name.includes(q)) contains.push(item);
    if (starts.length >= LIMIT) break;
  }
  return [...starts, ...contains].slice(0, LIMIT);
}

// Slack's custom emoji only exist on Slack, so WhatsApp gets standard ones only.
export function emojiSuggestions(emoji, query, platform) {
  const entries = Object.entries(emoji).filter(([, value]) => platform === 'slack' || !isCustomEmoji(value));
  return rank(entries, query, ([name]) => name).map(([name, value]) => ({type: 'emoji', key: name, name, value}));
}

export function contactSuggestions(contacts, query) {
  return rank(contacts, query, contact => contact.name).map(contact => ({type: 'contact', key: contact.id, ...contact}));
}

// A standard :shortcode: becomes the emoji itself, which every platform shows.
// Custom ones stay :named: for Slack to resolve.
export function replaceShortcodes(text, emoji) {
  return text.replace(/:([a-z0-9_+'\-]+):/g, (code, name) => {
    const value = emoji?.[name];
    return value && !isCustomEmoji(value) ? value : code;
  });
}

const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// "@Carlos" picked from the list goes to Slack as <@U123>, which pings him.
export function encodeMentions(text, mentions) {
  return Object.entries(mentions).reduce(
    (result, [name, id]) => result.replace(new RegExp(`@${escape(name)}(?![\\w])`, 'g'), `<@${id}>`),
    text,
  );
}
