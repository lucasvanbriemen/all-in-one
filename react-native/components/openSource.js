// Navigates to what a notification's source points at: "email.<mailbox>.<id>"
// or "messages.whatsapp.<jid>". Only the first two dots separate parts, since
// JIDs contain dots themselves (31612345678@s.whatsapp.net).
export function openSource(set, source) {
  const [kind, section, ...rest] = String(source || '').split('.');
  const id = rest.join('.');

  set('app.activeApp', kind);
  set('app.activeSidebarItem', section);
  if (kind === 'email') set('email.selectedEmailId', Number(id));
  if (kind === 'messages') set('messages.activeChannel', id);
  // "home.advent.<day>": the morning advent push opens that door.
  if (kind === 'home' && section === 'advent') set('seasonal.openDoor', Number(id));
}
