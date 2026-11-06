import {groupReactions} from '../components/messages/reactions';

test('groups reactions per emoji, counting people and marking mine', () => {
  const grouped = groupReactions([
    {emoji: '👍', from_me: false},
    {emoji: '👍', from_me: true},
    {emoji: '❤️', from_me: false},
  ]);
  expect(grouped).toEqual([
    {emoji: '👍', count: 2, mine: true},
    {emoji: '❤️', count: 1, mine: false},
  ]);
});

test('falls back to the raw reaction and skips empty ones', () => {
  expect(groupReactions([{reaction: '😂'}, {reaction: null}])).toEqual([{emoji: '😂', count: 1, mine: false}]);
  expect(groupReactions(undefined)).toEqual([]);
});
