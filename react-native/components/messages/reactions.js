export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

// One chip per emoji, with how many people used it and whether I'm one of them.
export function groupReactions(reactions = []) {
  const groups = new Map();
  reactions.forEach(reaction => {
    const emoji = reaction.emoji || reaction.reaction;
    if (!emoji) return;
    const group = groups.get(emoji) || {emoji, count: 0, mine: false};
    group.count += 1;
    group.mine = group.mine || Boolean(reaction.from_me);
    groups.set(emoji, group);
  });
  return [...groups.values()];
}
