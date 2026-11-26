jest.mock('../components/api', () => ({api: {}}));
import {contactSuggestions, emojiSuggestions, encodeMentions, replaceShortcodes, tokenAt} from '../components/messages/autocomplete';

const EMOJI = {joy: '😂', joy_cat: '😹', til: 'https://emoji.slack-edge.com/til.png', enjoy: '🎉'};

test('finds the token being typed', () => {
  expect(tokenAt('hey @car', 8)).toEqual({trigger: '@', query: 'car', start: 4, end: 8});
  expect(tokenAt('lol :jo', 7)).toMatchObject({trigger: ':', query: 'jo'});
  expect(tokenAt('note:', 5)).toBeNull();
  expect(tokenAt('mail@x', 6)).toBeNull();
});

test('ranks prefix matches first and keeps custom emoji to Slack', () => {
  expect(emojiSuggestions(EMOJI, 'joy', 'slack').map(s => s.name)).toEqual(['joy', 'joy_cat', 'enjoy']);
  expect(emojiSuggestions(EMOJI, 'ti', 'whatsapp')).toEqual([]);
  expect(emojiSuggestions(EMOJI, 'ti', 'slack').map(s => s.name)).toEqual(['til']);
  expect(contactSuggestions([{id: 'U1', name: 'Carlos'}, {id: 'U2', name: 'Remy'}], 'car')).toMatchObject([{id: 'U1'}]);
});

test('turns standard shortcodes into emoji and mentions into Slack ids', () => {
  expect(replaceShortcodes('haha :joy: :til: 10:30:00', EMOJI)).toBe('haha 😂 :til: 10:30:00');
  expect(encodeMentions('@Carlos and @Carlos2 hi', {Carlos: 'U1'})).toBe('<@U1> and @Carlos2 hi');
});
