import { DEFAULT_ICONS, FILE_EXTENSIONS, FILE_NAMES, FOLDER_NAMES, FOLDER_NAMES_EXPANDED, ICON_XML } from './fileIcons';

import React from 'react';
import {SvgXml} from 'react-native-svg';

function iconForFile(name) {
  const lowercased = name.toLowerCase();

  if (FILE_NAMES[lowercased]) {
    return FILE_NAMES[lowercased];
  }

  const parts = lowercased.split('.');

  for (let index = 1; index < parts.length; index++) {
    const match = FILE_EXTENSIONS[parts.slice(index).join('.')];

    if (match) {
      return match;
    }
  }

  return DEFAULT_ICONS.file;
}

function iconForFolder(name, isOpen) {
  const lowercased = name.toLowerCase();

  if (isOpen) {
    return FOLDER_NAMES_EXPANDED[lowercased] ?? DEFAULT_ICONS.folderExpanded;
  }

  return FOLDER_NAMES[lowercased] ?? DEFAULT_ICONS.folder;
}

export function FileIcon({name, isDirectory, isOpen, size = 16}) {
  const icon = isDirectory ? iconForFolder(name, isOpen) : iconForFile(name);

  return <SvgXml xml={ICON_XML[icon]} width={size} height={size} />;
}
