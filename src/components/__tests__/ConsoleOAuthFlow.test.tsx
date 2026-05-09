import { describe, expect, test, mock } from 'bun:test';
import * as React from 'react';

mock.module('react', () => ({
  ...React,
  useState: (initial: any) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useEffect: () => {},
  useRef: (initial: any) => ({ current: initial }),
  useCallback: (fn: any) => fn,
  useMemo: (fn: any) => fn(),
  useContext: () => ({}),
}));

import { ConsoleOAuthFlow } from '../ConsoleOAuthFlow.js';

// Mock dependencies
mock.module('src/services/analytics/index.js', () => ({
  logEvent: () => {},
}));

mock.module('../utils/localLlm.js', () => ({
  checkOllamaStatus: async () => true,
  listOllamaModels: async () => ['llama3.1', 'mistral'],
  pullOllamaModel: async () => {},
  pingUrl: async () => true,
}));

mock.module('../utils/settings/settings.js', () => ({
  getSettings_DEPRECATED: () => ({}),
  updateSettingsForSource: () => {},
}));

mock.module('../utils/auth.js', () => ({
  getOauthAccountInfo: async () => ({}),
  validateForceLoginOrg: async () => true,
}));

mock.module('../services/oauth/index.js', () => ({
  OAuthService: {
    start: async () => {},
  },
}));

mock.module('@anthropic/ink', () => ({
  useTerminalNotification: () => () => {},
  setClipboard: () => {},
  Box: ({ children }: any) => <div>{children}</div>,
  Link: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <div>{children}</div>,
  KeyboardShortcutHint: () => null,
}));

mock.module('../hooks/useTerminalSize.js', () => ({
  useTerminalSize: () => ({ columns: 80, rows: 24 }),
}));

mock.module('../keybindings/useKeybinding.js', () => ({
  useKeybinding: () => {},
}));

describe('ConsoleOAuthFlow', () => {
  test('renders initial login method selection', () => {
    const onDone = () => {};
    const element = ConsoleOAuthFlow({ onDone }) as React.ReactElement;

    // The component returns a React element tree
    // We expect it to contain the title and options
    const str = JSON.stringify(element);
    expect(str).toContain('Select login method');
    expect(str).toContain('Anthropic Console');
    expect(str).toContain('Local LLM');
  });
});
