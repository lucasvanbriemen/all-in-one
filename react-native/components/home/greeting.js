// Each option is [weight, template, requiredTags].
// Templates reference other rules with {slot} and expand recursively.
const RULES = {
  greeting: [
    [5, '{opener}{name}{punct}'],
    [3, '{opener}{name}{punct} {followup}'],
    [1, '{interjection}, {opener}{name}{punct}', ['casual']],
  ],
  opener: [
    [4, 'good {daypart}'],
    [2, 'a very good {daypart} to you', ['formal']],
    [1, 'top of the {daypart}', ['casual']],
    [4, 'hey', ['casual']],
    [3, 'whats cooking?', ['casual']],
    [3, 'hi', ['casual']],
    [3, 'hello'],
    [1, 'howdy', ['casual']],
    [1, 'greetings', ['formal']],
  ],
  interjection: [
    [1, 'oh hey'],
    [1, 'well well'],
    [1, 'ah'],
  ],
  followup: [
    [3, 'how are you?'],
    [2, 'hope you slept well.', ['morning']],
    [2, "how's your day going?", ['afternoon']],
    [2, "late at work?", ['night']],
    [2, 'long day?', ['evening']],
    [1, 'good to see you.'],
    [1, "what's new?", ['casual']],
  ],
};

const MEMORY = 5;
const recent = [];

function dayPart(hour) { 
  if (hour < 4 ) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  if (hour < 22) return 'evening';
  return 'night';
}

function pickWeighted(options) {
  const total = options.reduce((sum, [weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const option of options) {
    roll -= option[0];
    if (roll <= 0) return option[1];
  }
  return options[options.length - 1][1];
}

function pick(slot, tags) {
  const eligible = RULES[slot].filter(([, , required = []]) =>
    required.every((tag) => tags.has(tag))
  );
  return pickWeighted(eligible);
}

function expand(template, tags, literals) {
  return template.replace(/\{(\w+)\}/g, (_, slot) =>
    slot in literals ? literals[slot] : expand(pick(slot, tags), tags, literals)
  );
}

function capitalise(text) {
  return text.replace(/(^|[.!?] )([a-z])/g, (_, lead, letter) => lead + letter.toUpperCase());
}

export const greeting = {
  generateGreeting() {
    const NAME_OPTIONS = ["Lucas"];
    const NAME = NAME_OPTIONS[Math.floor(Math.random() * NAME_OPTIONS.length)];

    const resolvedRegister = (Math.random() < 0.5 ? 'casual' : 'formal');
    const daypart = dayPart(new Date().getHours());
    const tags = new Set([resolvedRegister, daypart]);

    const useName = Math.random() < 0.5;
    const literals = {
      daypart,
      name: NAME && useName ? ` ${NAME}` : '',
      punct: Math.random() < 0.6 ? '!' : '.',
    };

    let text = '';
    for (let attempt = 0; attempt < 10; attempt += 1) {
      text = capitalise(expand(pick('greeting', tags), tags, literals));
      if (!recent.includes(text)) break;
    }

    recent.push(text);
    if (recent.length > MEMORY) recent.shift();
    return text;
  },
};