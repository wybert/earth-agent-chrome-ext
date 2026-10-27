import React, { useState } from 'react';
import { getGeeMapBridgeSource } from '../lib/map/gee-bridge-source';
import { executeMapTool } from '../lib/tools/services/map-service';
import { selectBestEarthEngineTab } from '../lib/utils';

export function MapConnectionSettings() {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const source = getGeeMapBridgeSource();
  const check = async () => {
    setBusy(true);
    try {
      const tab = selectBestEarthEngineTab(
        await chrome.tabs.query({ url: '*://code.earthengine.google.com/*' })
      );
      if (!tab?.id) throw new Error('Open an Earth Engine Code Editor tab first.');
      const view = await executeMapTool(tab.id, 'mapInspect', { action: 'context' });
      setStatus(`Connected: ${view.mapId}. Center ${view.center.join(', ')}, zoom ${view.zoom}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="space-y-3 border-t py-4" aria-label="Map connection">
      <h3 className="font-semibold">Map coordinates & drawing (experimental)</h3>
      <p className="text-sm text-muted-foreground">
        Connect a GEE map for geographic coordinates, visual guidance and GEE native drawing tools.
        User drawings use a blue native draft: Confirm saves it; Cancel discards only the draft. No
        cloud bridge is needed.
      </p>
      <ol className="list-decimal pl-5 text-sm space-y-1">
        <li>
          Copy the setup code below and append it after your existing map setup in the GEE editor.
          Do not replace your script.
        </li>
        <li>
          Review your script and run it when ready. Running executes your entire script, not just
          this connection code.
        </li>
        <li>
          Look for “Earth Agent map connected” on the map, then check the connection here. Reconnect
          after resetting or rerunning the map.
        </li>
      </ol>
      <p className="text-sm text-muted-foreground">
        Upgrading an existing map link? Replace only the previous Earth Agent setup block with the
        new code before running. Do not append a second bridge. Native interactions require this
        updated setup code.
      </p>
      <p className="text-sm text-muted-foreground">
        For a custom ui.Map, replace the final Map argument with your map variable. Existing layers
        are preserved. Agent drawings are session-local; export their GeoJSON or save them in your
        script if you need persistence. Native edits require Do mode or the corresponding
        custom-profile tools.
      </p>
      <details>
        <summary className="cursor-pointer text-sm">Review map setup code</summary>
        <textarea
          aria-label="Map setup code"
          readOnly
          value={source}
          rows={8}
          className="w-full font-mono text-xs border rounded p-2"
        />
      </details>
      <div className="flex gap-2">
        <button
          type="button"
          className="border rounded px-3 py-1 text-sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(source);
              setStatus('Setup code copied. Append it to your script and run only when ready.');
            } catch {
              setStatus('Clipboard unavailable. Select and copy the code in the review panel.');
            }
          }}
        >
          Copy map setup
        </button>
        <button
          type="button"
          disabled={busy}
          className="border rounded px-3 py-1 text-sm"
          onClick={() => void check()}
        >
          {busy ? 'Checking…' : 'Check map connection'}
        </button>
      </div>
      <p role="status" className="text-sm break-words">
        {status}
      </p>
    </section>
  );
}
