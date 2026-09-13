import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import App from '../App';
import { EmailPage } from '../components/email/EmailPage';
import { EmailListing } from '../components/email/EmailListing';
import { EmailContent } from '../components/email/EmailContent';
import { MobileNavigation } from '../components/sidebar/MobileNavigation';
import { Sidebar } from '../components/sidebar/Sidebar';
import { useCompactLayout } from '../components/useCompactLayout';

jest.mock('../components/useCompactLayout', () => ({
  useCompactLayout: jest.fn(() => true),
}));
jest.mock('../components/theme', () => ({
  glass: () => ({}),
  useTheme: () => ({ primary: 'blue' }),
  useThemedStyles: create => create({ primary: 'blue', onSurface: 'black' }),
}));
jest.mock('../components/api', () => ({
  api: {
    get: jest.fn(async path => {
      if (path === '/meta_data') {
        return {
          config: {
            home: [{ path: 'home', name: 'Home' }],
            email: [
              { path: 'work', name: 'Work' },
              { path: 'personal', name: 'Personal' },
            ],
            music: [],
            code: [{ path: 'files', name: 'Files' }],
          },
        };
      }
      return [];
    }),
  },
}));
jest.mock('../components/music/player', () => ({
  player: { subscribe: () => () => {} },
}));
jest.mock('../components/code/CodePage', () => ({ CodePage: () => null }));
jest.mock('../components/icons', () => ({
  Icon: () => null,
  LogoIcon: () => null,
}));
jest.mock('../components/email/EmailListing', () => ({
  EmailListing: () => null,
}));
jest.mock('../components/email/EmailContent', () => ({
  EmailContent: () => null,
}));
jest.mock('react-native-safe-area-context', () => {
  const { View: MockView } = require('react-native');
  return { SafeAreaProvider: MockView, SafeAreaView: MockView, useSafeAreaInsets: () => ({top: 59, bottom: 34, left: 0, right: 0}) };
});

let tree;
afterEach(async () => {
  if (tree) {
    await act(() => tree.unmount());
  }
  tree = null;
  jest.clearAllMocks();
});

async function render(element) {
  await act(async () => {
    tree = ReactTestRenderer.create(element);
  });
  return tree.root;
}

function button(root, label) {
  return root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node.findAll(child => child.props.children === label).length > 0,
  )[0];
}

test('phone navigation switches applications and selects a valid mailbox', async () => {
  useCompactLayout.mockReturnValue(true);
  const root = await render(<App />);
  expect(root.findAllByType(Sidebar)).toHaveLength(0);
  expect(root.findAllByType(MobileNavigation)).toHaveLength(1);
  await act(async () => button(root, 'Email').props.onPress());
  expect(root.findByType(EmailPage).props.activeSidebarItem).toBe('work');
  await act(async () => button(root, 'Personal').props.onPress());
  expect(root.findByType(EmailPage).props.activeSidebarItem).toBe('personal');
  await act(async () => button(root, 'Music').props.onPress());
  expect(root.findAllByType(EmailPage)).toHaveLength(0);
});

test('phone mail opens full width and returns to the mounted listing', async () => {
  useCompactLayout.mockReturnValue(true);
  const root = await render(<EmailPage activeSidebarItem="work" />);
  const listing = root.findByType(EmailListing);
  expect(root.findAllByType(EmailContent)).toHaveLength(0);
  await act(() =>
    listing.props.onSelectEmail({ id: 42, subject: 'A long email subject' }),
  );
  expect(root.findByType(EmailContent).props.email.id).toBe(42);
  expect(
    StyleSheet.flatten(root.findByType(EmailListing).parent.props.style)
      .display,
  ).toBe('none');
  await act(() => button(root, '‹ Back to inbox').props.onPress());
  expect(root.findAllByType(EmailContent)).toHaveLength(0);
  expect(root.findByType(EmailListing)).toBe(listing);
});

test('wide windows keep the sidebar and split mail view', async () => {
  useCompactLayout.mockReturnValue(false);
  const root = await render(<App />);
  expect(root.findAllByType(Sidebar)).toHaveLength(1);
  expect(root.findAllByType(MobileNavigation)).toHaveLength(0);
  await act(() => tree.update(<EmailPage activeSidebarItem="work" />));
  expect(tree.root.findAllByType(EmailListing)).toHaveLength(1);
  expect(tree.root.findAllByType(EmailContent)).toHaveLength(1);
});
