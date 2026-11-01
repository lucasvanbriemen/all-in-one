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

// Mixed in during the season (see generateGreeting's `season` argument).
const FESTIVE = {
  opener: ['merry christmas', 'ho ho ho', 'happy holidays', "season's greetings", 'fijne feestdagen'],
  followup: [
    'got your presents sorted?',
    "mulled wine o'clock?",
    'how many kerstkransjes today?',
    'cozy enough?',
    "opened today's door yet?",
    'still not tired of Mariah?',
  ],
};

const FIXED_DAYS = {
  '11-24': ['Merry Christmas Eve, {name}!', "It's Christmas Eve, {name}. Feet up.", 'One more sleep, {name}! 🎄'],
  '11-25': ['Merry Christmas, {name}! 🎄', 'Ho ho ho, {name}! Merry Christmas!', 'Merry Christmas, {name}. Did Santa come?'],
  '11-26': ['Happy Tweede Kerstdag, {name}!', 'Second Christmas Day, {name}. Leftovers?', 'Still full, {name}?'],
  '11-31': ['Last day of the year, {name}!', 'Oliebollen time, {name}!'],
  '0-1': ['Happy New Year, {name}! 🎆', 'Gelukkig nieuwjaar, {name}!', 'Happy New Year, {name}. Resolutions holding up?'],
};

const BETWEEN = [
  'Ah, {name}, the days where nobody knows what day it is.',
  'Is it Tuesday? Saturday? Who knows, {name}.',
  'Still eating leftovers, {name}?',
];

const WEATHER = {
  rain: [
    "Another white Christmas, {name}… wait, no, it's raining. Classic Dutch Christmas.",
    'Dreaming of a white Christmas, {name}? Keep dreaming. It is raining.',
    "Snow forecast: no. Rain forecast: obviously. Morning, {name}.",
  ],
  snow: ["It's actually snowing, {name}! ❄️", 'Look outside, {name}. Real snow!'],
};

const pick = list => list[Math.floor(Math.random() * list.length)];

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

  // `season` is {date, phase, decorated, weather} from the seasonal module;
  // without it (or out of season) the greeting is the everyday one.
  seasonalGreeting(season, name) {
    if (!season?.decorated) return null;
    const {date, phase, weather} = season;
    const fixed = FIXED_DAYS[`${date.getMonth()}-${date.getDate()}`];

    if (fixed) return pick(fixed).replace('{name}', name);
    if (phase === 'between') return pick(BETWEEN).replace('{name}', name);
    if (phase === 'newyear') return `Happy ${date.getFullYear()}, ${name}!`;
    if (WEATHER[weather] && Math.random() < 0.35) return pick(WEATHER[weather]).replace('{name}', name);
    return null;
  },

  generateGreeting(season = null) {
    const NAME_OPTIONS = ["Lucas", "Lukaas"];
    const name = NAME_OPTIONS[Math.floor(Math.random() * NAME_OPTIONS.length)];

    const seasonal = this.seasonalGreeting(season, name);
    if (seasonal) return seasonal;
    const festive = season?.decorated && season.phase === 'advent' && Math.random() < 0.5;

    const greetingFormat = RULES.greeting[Math.floor(Math.random() * RULES.greeting.length)];
    const opener = festive ? pick(FESTIVE.opener) : RULES.opener[Math.floor(Math.random() * RULES.opener.length)];
    const interjection = RULES.interjection[Math.floor(Math.random() * RULES.interjection.length)];
    const daypart = this.partOfDay(new Date().getHours());
    const followups = this.validFollowupList(daypart);
    const followup = festive ? pick(FESTIVE.followup) : followups[Math.floor(Math.random() * followups.length)].text;

    return this.formatGreetingItem(greetingFormat, opener, interjection, followup, name, daypart, Math.random() < 0.6 ? '!' : '.');
  },
};