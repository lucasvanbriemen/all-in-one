import {GithubIcon} from './github';
import {HomeIcon} from './home';
import {PatheIcon} from './pathe';
import React from 'react';
import {WorkIcon} from './work';
import {CodeIcon} from './code';

export {LogoIcon} from './logo';

// Not part of the sidebar set below — the file tree reaches for these by name.
export {ChevronIcon} from './chevron';
export {FileIcon} from './file';
export {FolderIcon} from './folder';

// Keyed by the `path` of each entry in Config::CONFIG (app/models/config.rb),
// which is what the sidebar rows are identified by. An entry without an icon
// renders nothing rather than a placeholder, so adding a mailbox server-side
// doesn't break the client.
const ICONS = {
  home: HomeIcon,
  work: WorkIcon,
  github: GithubIcon,
  pathe: PatheIcon,
  code: CodeIcon,
};

export function SidebarIcon({name, size, color}) {
  const Icon = ICONS[name];

  return Icon ? <Icon size={size} color={color} /> : null;
}
