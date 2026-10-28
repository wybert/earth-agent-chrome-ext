import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { LocalMCPSettings } from './LocalMCPSettings';
import { MCP_ENABLED_STORAGE_KEY, MCP_LEGACY_TOKEN_STORAGE_KEY } from '../constants/mcp';

let container: HTMLDivElement;
let root: Root;
let settings: Record<string, unknown>;
beforeEach(() => {
  jest.clearAllMocks();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  settings = {};
  (chrome.storage as any).onChanged = { addListener: jest.fn(), removeListener: jest.fn() };
  (chrome as any).permissions = { request: jest.fn(async () => true) };
  (chrome.storage.local.get as jest.Mock).mockImplementation(async () => settings);
  (chrome.storage.local.set as jest.Mock).mockImplementation(async (values) => {
    Object.assign(settings, values);
  });
  (chrome.storage.local.remove as jest.Mock).mockImplementation(async (key) => {
    for (const item of Array.isArray(key) ? key : [key]) delete settings[item as string];
  });
  (chrome.runtime.sendMessage as jest.Mock).mockResolvedValue({
    enabled: false,
    message: 'MCP is off.',
    geeTabs: 0,
  });
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: jest.fn(async () => {}) },
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
const render = async () => {
  await act(async () => root.render(React.createElement(LocalMCPSettings)));
};
const click = async (text: string) => {
  const button = Array.from(container.querySelectorAll('button')).find((element) =>
    element.textContent?.includes(text)
  );
  expect(button).toBeDefined();
  await act(async () => button!.click());
};

it('shows setup before permission is granted and stays off after denial', async () => {
  (chrome.permissions.request as jest.Mock).mockResolvedValue(false);
  await render();
  expect(container.textContent).toContain('No Earth Agent backend');
  await click('Enable MCP');
  expect(settings[MCP_ENABLED_STORAGE_KEY]).not.toBe(true);
  expect(container.textContent).toContain('Local access was not granted');
});

it('requests local permission and copies a configuration without a pairing key', async () => {
  await render();
  await click('Enable MCP');
  expect(chrome.permissions.request).toHaveBeenCalledWith({ origins: ['http://127.0.0.1/*'] });
  expect(settings[MCP_ENABLED_STORAGE_KEY]).toBe(true);
  expect(container.querySelector('textarea')).toBeNull();
  await click('Copy MCP setup');
  const config = JSON.parse((navigator.clipboard.writeText as jest.Mock).mock.calls[0][0]);
  expect(config.mcpServers['earth-agent'].env).toEqual({
    EARTH_AGENT_EXTENSION_ID: chrome.runtime.id,
    EARTH_AGENT_WS_PORT: '3847',
  });
  expect(config.mcpServers['earth-agent'].env.EARTH_AGENT_TOKEN).toBeUndefined();
  expect(chrome.storage.local.remove).toHaveBeenCalledWith(MCP_LEGACY_TOKEN_STORAGE_KEY);
  await click('Disable MCP');
  expect(settings[MCP_ENABLED_STORAGE_KEY]).toBe(false);
});

it('removes the legacy pairing key when saving the tokenless configuration', async () => {
  settings = { [MCP_ENABLED_STORAGE_KEY]: true, [MCP_LEGACY_TOKEN_STORAGE_KEY]: 'a'.repeat(64) };
  await render();
  await click('Copy MCP setup');
  expect(chrome.storage.local.remove).toHaveBeenCalledWith(MCP_LEGACY_TOKEN_STORAGE_KEY);
  expect(settings[MCP_LEGACY_TOKEN_STORAGE_KEY]).toBeUndefined();
  expect(container.textContent).not.toContain('Reset pairing key');
});
