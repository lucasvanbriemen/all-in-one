// Each option is [weight, template, requiredTags].
// Templates reference other rules with {slot} and expand recursively.
const RULES = {
  greeting: [
    '{opener} {name}{punct}',
    '{opener} {name}{punct} {followup}',
    '{interjection}, {opener} {name}{punct}',
  ],
  opener: [
    'good {daypart}',
    'a very good {daypart} to you',
    'top of the {daypart}',
    'hey',
    'whats cooking?',
    'hi',
    'hello',
    'howdy',
    'greetings',
  ],
  interjection: [
    'oh hey',
    'well well',
    'ah',
  ],
  followup: [
    'how are you?',
    'hope you slept well.', ['morning'],
    "how's your day going?", ['afternoon'],
    "late at work?", ['night'],
    'long day?', ['evening'],
    'good to see you.',
    "what's new?",
  ],
};

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
  formatGreetingItem(greetingFormat, opener, interjection, followup, name, daypart, punct) {
    let text = greetingFormat
      .replace('{opener}', opener)
      .replace('{interjection}', interjection)
      .replace('{followup}', followup);

    text = text.replace('{name}', name).replace('{daypart}', daypart).replace('{punct}', punct);

    text = capitalise(text);

    return text;
  },

  generateGreeting() {
    const NAME_OPTIONS = ["Lucas", "Lukaas"];
    const name = NAME_OPTIONS[Math.floor(Math.random() * NAME_OPTIONS.length)];

    const greetingFormat = RULES['greeting'][Math.floor(Math.random() * RULES['greeting'].length)];
    const opener = RULES['opener'][Math.floor(Math.random() * RULES['opener'].length)];
    const interjection = RULES['interjection'][Math.floor(Math.random() * RULES['interjection'].length)];
    const followup = RULES['followup'][Math.floor(Math.random() * RULES['followup'].length)];
    const daypart = dayPart(new Date().getHours());

    // const resolvedRegister = (Math.random() < 0.5 ? 'casual' : 'formal');
    // const daypart = dayPart(new Date().getHours());
    // const tags = new Set([resolvedRegister, daypart]);

    // const useName = Math.random() < 0.5;
    // const literals = {
    //   daypart,
    //   name: NAME && useName ? ` ${NAME}` : '',
    //   punct: Math.random() < 0.6 ? '!' : '.',
    // };

    // let text = '';
    // for (let attempt = 0; attempt < 10; attempt += 1) {
    //   text = capitalise(expand(pick('greeting', tags), tags, literals));
    // }

    return this.formatGreetingItem(greetingFormat, opener, interjection, followup, name, daypart, Math.random() < 0.6 ? '!' : '.');
  },
};