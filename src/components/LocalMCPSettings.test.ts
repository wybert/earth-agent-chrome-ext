import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { LocalMCPSettings } from './LocalMCPSettings';
import { MCP_ENABLED_STORAGE_KEY, MCP_TOKEN_STORAGE_KEY } from '../constants/mcp';

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

it('requests permission, generates a local key and copies a paired config', async () => {
  await render();
  await click('Enable MCP');
  expect(chrome.permissions.request).toHaveBeenCalledWith({ origins: ['http://127.0.0.1/*'] });
  expect(settings[MCP_ENABLED_STORAGE_KEY]).toBe(true);
  expect(settings[MCP_TOKEN_STORAGE_KEY]).toMatch(/^[a-f0-9]{64}$/);
  expect(container.querySelector('textarea')).toBeNull();
  await click('Save & copy');
  const config = JSON.parse((navigator.clipboard.writeText as jest.Mock).mock.calls[0][0]);
  expect(config.mcpServers['earth-agent'].env.EARTH_AGENT_TOKEN).toBe(
    settings[MCP_TOKEN_STORAGE_KEY]
  );
  await click('Disable MCP');
  expect(settings[MCP_ENABLED_STORAGE_KEY]).toBe(false);
});

it('key reset revokes the old configuration and disables MCP', async () => {
  const previous = 'a'.repeat(64);
  settings = { [MCP_ENABLED_STORAGE_KEY]: true, [MCP_TOKEN_STORAGE_KEY]: previous };
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  await render();
  await click('Reset pairing key');
  expect(settings[MCP_ENABLED_STORAGE_KEY]).toBe(false);
  expect(settings[MCP_TOKEN_STORAGE_KEY]).not.toBe(previous);
  expect(container.textContent).toContain('Old pairing key revoked');
});
