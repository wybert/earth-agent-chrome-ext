import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  MCP_ENABLED_STORAGE_KEY,
  MCP_LEGACY_TOKEN_STORAGE_KEY,
  MCP_PORT_STORAGE_KEY,
  MCP_DEFAULT_PORT,
  MCP_ORIGIN,
  createMCPConfig,
  validMCPPort,
} from '../constants/mcp';
import type { MCPStatus } from '../background/mcp-connection';

export function LocalMCPSettings() {
  const [enabled, setEnabled] = useState(false);
  const [port, setPort] = useState(String(MCP_DEFAULT_PORT));
  const [status, setStatus] = useState<(MCPStatus & { geeTabs?: number }) | null>(null);
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const settings = await chrome.storage.local.get([
        MCP_ENABLED_STORAGE_KEY,
        MCP_PORT_STORAGE_KEY,
      ]);
      if (!active) return;
      setEnabled(settings[MCP_ENABLED_STORAGE_KEY] === true);
      setPort(String(settings[MCP_PORT_STORAGE_KEY] ?? MCP_DEFAULT_PORT));
    };
    const refresh = async () => {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_LOCAL_MCP_STATUS' });
        if (active) setStatus(response || null);
      } catch {
        if (active) setStatus(null);
      }
    };
    const changed = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (
        area === 'local' &&
        [MCP_ENABLED_STORAGE_KEY, MCP_PORT_STORAGE_KEY].some(
          (key) => key in changes
        )
      )
        void load().catch(() => {});
    };
    void load().catch(() => setFeedback('Unable to load local MCP settings.'));
    void refresh();
    chrome.storage.onChanged.addListener(changed);
    const timer = setInterval(refresh, 2000);
    return () => {
      active = false;
      clearInterval(timer);
      chrome.storage.onChanged.removeListener(changed);
    };
  }, []);

  const save = async (nextEnabled: boolean) => {
    if (!validMCPPort(Number(port))) throw new Error('Choose a port from 1024 to 65535.');
    await chrome.storage.local.set({
      [MCP_ENABLED_STORAGE_KEY]: nextEnabled,
      [MCP_PORT_STORAGE_KEY]: Number(port),
    });
    await chrome.storage.local.remove(MCP_LEGACY_TOKEN_STORAGE_KEY);
    setEnabled(nextEnabled);
  };
  const toggle = async () => {
    setBusy(true);
    setFeedback('');
    try {
      // Request directly from the click gesture, before any storage awaits.
      if (!enabled && !(await chrome.permissions.request({ origins: [MCP_ORIGIN] }))) {
        setFeedback('Local access was not granted. MCP remains off.');
        return;
      }
      if (enabled) {
        await chrome.storage.local.set({ [MCP_ENABLED_STORAGE_KEY]: false });
        setEnabled(false);
      } else await save(true);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to change MCP settings.');
    } finally {
      setBusy(false);
    }
  };
  const config = JSON.stringify(createMCPConfig(Number(port), chrome.runtime.id), null, 2);
  const act = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 border-t pt-4 mt-4" aria-label="Local MCP setup">
      <h3 className="text-sm font-semibold">Local MCP — connect your Agent</h3>
      <p className="text-xs text-muted-foreground">
        No Earth Agent backend or extension AI API key is needed. Requires Node.js 22+ and a local
        MCP-capable Agent. Enabling MCP allows the connected Agent to read, edit and run code in your
        logged-in Earth Engine browser. Only use trusted local Agents.
      </p>
      <ol className="list-decimal pl-5 text-xs space-y-1">
        <li>Enable local access below.</li>
        <li>
          Copy the configuration into your Agent’s MCP settings, merge with existing servers, then
          restart its connector.
        </li>
        <li>Open and sign in to Earth Engine. Ask your Agent to read the current editor code.</li>
      </ol>
      <Button type="button" disabled={busy} onClick={() => void toggle()}>
        {enabled ? 'Disable MCP / Disconnect' : 'Enable MCP and allow local access'}
      </Button>
      <div className="text-xs space-y-1" role="status">
        <p>{status?.message || 'Checking background connection…'}</p>
        {enabled && (
          <p>
            {status?.geeTabs
              ? `${status.geeTabs} Earth Engine tab(s) open.`
              : 'Open an Earth Engine tab and sign in before using browser tools.'}
          </p>
        )}
      </div>
      <details className="space-y-2 text-xs">
        <summary className="cursor-pointer text-muted-foreground">
          Advanced connection settings
        </summary>
        <label className="block">
          Local connector port
          <Input
            type="number"
            min={1024}
            max={65535}
            value={port}
            onChange={(event) => setPort(event.target.value)}
          />
        </label>
        <p className="text-muted-foreground">
          Keep the default unless another local MCP connector already uses this port.
        </p>
      </details>
      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          disabled={busy}
          onClick={() =>
            void act(async () => {
              await save(enabled);
              await navigator.clipboard.writeText(config);
              setFeedback(
                'Configuration copied. Restart the Agent connector after changing configuration.'
              );
            })
          }
        >
          Copy MCP setup
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy || !enabled}
          onClick={() =>
            void act(async () => {
              await save(true);
              setStatus(await chrome.runtime.sendMessage({ type: 'RECONNECT_LOCAL_MCP' }));
            })
          }
        >
          Retry connection
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void chrome.tabs.create({ url: 'https://code.earthengine.google.com/' })}
        >
          Open Earth Engine
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        You only need to paste this setup into your Agent once. One connector can use each port;
        browser operations already started may continue after disconnect.
      </p>
      {feedback && (
        <p className="text-xs" role="status">
          {feedback}
        </p>
      )}
    </section>
  );
}
