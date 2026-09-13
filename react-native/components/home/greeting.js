const RULES = {
  greeting: [
    '{opener}{punct}',
    '{name}, {opener}{punct}',
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
    "there he is"
  ],
  followup: [
    {text: 'how are you?', time: 'any'},
    {text: 'hope you slept well.', time: 'morning'},
    {text: "how's your day going?", time: 'afternoon'},
    {text: "late at work?", time: 'night'},
    {text: "long day?", time: 'evening'},
    {text: 'good to see you.', time: 'any'},
    {text: "what's new?", time: 'any'},
  ],
};

export const greeting = {
  formatGreetingItem(greetingFormat, opener, interjection, followup, name, daypart, punct) {
    let text = greetingFormat
      .replace('{opener}', opener)
      .replace('{interjection}', interjection)
      .replace('{followup}', followup);

    text = text.replace('{name}', name).replace('{daypart}', daypart).replace('{punct}', punct);

    text = text.replace(/(^|[.!?] )([a-z])/g, (_, lead, letter) => lead + letter.toUpperCase());

    return text;
  },

  validFollowupList(daypart) {
    return RULES.followup.filter(followup => followup.time === 'any' || followup.time === daypart);
  },

  partOfDay(hour) {
    if (hour < 4) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'night';
  },

  generateGreeting() {
    const NAME_OPTIONS = ["Lucas", "Lukaas"];
    const name = NAME_OPTIONS[Math.floor(Math.random() * NAME_OPTIONS.length)];

    const greetingFormat = RULES.greeting[Math.floor(Math.random() * RULES.greeting.length)];
    const opener = RULES.opener[Math.floor(Math.random() * RULES.opener.length)];
    const interjection = RULES.interjection[Math.floor(Math.random() * RULES.interjection.length)];
    const followup = this.validFollowupList(daypart)[Math.floor(Math.random() * this.validFollowupList(daypart).length)].text;
    const daypart = this.partOfDay(new Date().getHours());

    return this.formatGreetingItem(greetingFormat, opener, interjection, followup, name, daypart, Math.random() < 0.6 ? '!' : '.');
  },
};