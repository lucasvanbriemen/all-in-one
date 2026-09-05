import {ChevronDown} from './chevronDown';
import {ChevronLeft} from './chevronLeft';
import {ChevronRight} from './chevronRight';
import {ChevronTop} from './chevronTop';
import {CodeIcon} from './code';
import {CollapseAllIcon} from './collapseAll';
import {CopyIcon} from './copy';
import {CutIcon} from './cut';
import {FilesIcon} from './files';
import {GithubIcon} from './github';
import {HomeIcon} from './home';
import {NewFileIcon} from './newFile';
import {NewFolderIcon} from './newFolder';
import {PasteIcon} from './paste';
import {PatheIcon} from './pathe';
import React from 'react';
import {RefreshIcon} from './refresh';
import {RenameIcon} from './rename';
import {SearchIcon} from './search';
import {TrashIcon} from './trash';
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
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-top': ChevronTop,
  'chevron-down': ChevronDown,
  files: FilesIcon,
  search: SearchIcon,
  'new-file': NewFileIcon,
  'new-folder': NewFolderIcon,
  rename: RenameIcon,
  trash: TrashIcon,
  refresh: RefreshIcon,
  copy: CopyIcon,
  cut: CutIcon,
  paste: PasteIcon,
};

export function Icon({name, size, color}) {
  const IconToRender = ICONS[name];

  return IconToRender ? <IconToRender size={size} color={color} /> : null;
}
