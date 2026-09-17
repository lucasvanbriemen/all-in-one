import {ChevronDown} from './chevronDown';
import {ChevronLeft} from './chevronLeft';
import {ChevronRight} from './chevronRight';
import {ChevronTop} from './chevronTop';
import {CodeIcon} from './code';
import {CrossIcon} from './cross';
import {FilesIcon} from './files';
import {GithubIcon} from './github';
import {HeartIcon} from './heart';
import {HeartOutlineIcon} from './heartOutline';
import {HomeIcon} from './home';
import {LastIcon} from './last';
import {NextIcon} from './next';
import {PatheIcon} from './pathe';
import {PauseIcon} from './pause';
import {PlayIcon} from './play';
import React from 'react';
import {SearchIcon} from './search';
import {WorkIcon} from './work';

export {LogoIcon} from './logo';

// Keyed by the `path` of each entry in Config::CONFIG (app/models/config.rb),
// which is what the sidebar rows are identified by. An entry without an icon
// renders nothing rather than a placeholder, so adding a mailbox server-side
// doesn't break the client.
const ICONS = {
  home: HomeIcon,
  work: WorkIcon,
  github: GithubIcon,
  git: GithubIcon,
  pathe: PatheIcon,
  code: CodeIcon,
  cross: CrossIcon,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-top': ChevronTop,
  'chevron-down': ChevronDown,
  files: FilesIcon,
  search: SearchIcon,
  play: PlayIcon,
  pause: PauseIcon,
  next: NextIcon,
  last: LastIcon,
  heart: HeartIcon,
  'heart-outline': HeartOutlineIcon,
};

export function Icon({name, size, color}) {
  const IconToRender = ICONS[name];

  return IconToRender ? <IconToRender size={size} color={color} /> : null;
}
