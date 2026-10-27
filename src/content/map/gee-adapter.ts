import { MapView, validatePosition } from '../../lib/map/spatial';

const STATE = 'input[placeholder="earth-agent-map-state-v1"]';
const COMMAND = 'input[placeholder="earth-agent-map-command-v1"]';
const RESPONSE = 'input[placeholder="earth-agent-map-response-v1"]';

export class GeeMapAdapter {
  constructor(
    readonly element: HTMLElement,
    private state: HTMLInputElement
  ) {}

  get connected() {
    return this.element.isConnected && this.state.isConnected && this.element.contains(this.state);
  }

  static list() {
    return Array.from(document.querySelectorAll<HTMLInputElement>(STATE)).flatMap((input) => {
      try {
        const state = JSON.parse(input.value);
        return typeof state.mapId === 'string'
          ? [{ mapId: state.mapId, ready: state.ready === true }]
          : [];
      } catch {
        return [];
      }
    });
  }

  static discover(mapId?: string): GeeMapAdapter {
    const candidates = Array.from(document.querySelectorAll<HTMLInputElement>(STATE)).filter(
      (input) => {
        try {
          return !mapId || JSON.parse(input.value).mapId === mapId;
        } catch {
          return false;
        }
      }
    );
    if (!candidates.length)
      throw new Error(
        'MAP_BRIDGE_REQUIRED: connect the map using the setup code in Earth Agent Settings. Do not replace or run the user script automatically.'
      );
    if (candidates.length !== 1)
      throw new Error('AMBIGUOUS_MAP: specify a mapId; multiple map bridges were found.');
    const element = candidates[0].closest<HTMLElement>('.ui-map');
    if (!element)
      throw new Error('UNSUPPORTED_MAP: could not locate the connected GEE map container.');
    return new GeeMapAdapter(element, candidates[0]);
  }

  readView(): MapView {
    if (!this.connected)
      throw new Error('Map bridge disconnected. Reconnect after rerunning your script.');
    const state = JSON.parse(this.state.value);
    if (state.error) throw new Error(`GEE_MAP_STATE_ERROR: ${String(state.error)}`);
    if (!state.ready) throw new Error('MAP_MOVING: wait for the map state to settle, then retry.');
    validatePosition(state.center);
    if (
      !Array.isArray(state.bounds) ||
      state.bounds.length !== 4 ||
      !state.bounds.every(Number.isFinite)
    )
      throw new Error('Invalid geographic map bounds.');
    const rect = this.element.getBoundingClientRect();
    const size = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    };
    if (rect.width <= 0 || rect.height <= 0) throw new Error('Map is not visible.');
    return {
      mapId: state.mapId,
      revision: JSON.stringify([state.mapId, state.revision, size, viewport]),
      capturedAt: Date.now(),
      rect: size,
      viewport,
      center: state.center,
      zoom: state.zoom,
      bounds: {
        west: state.bounds[0],
        south: state.bounds[1],
        east: state.bounds[2],
        north: state.bounds[3],
      },
      projection: state.projection,
      heading: state.heading,
      tilt: state.tilt,
    };
  }

  async native(action: string, args: unknown): Promise<unknown> {
    const view = this.readView();
    if (action.startsWith('interaction_') && JSON.parse(this.state.value).nativeInteraction !== 1)
      throw new Error(
        'MAP_BRIDGE_UPDATE_REQUIRED: replace only the old Earth Agent setup block with the current code from Settings and run when ready. Native interaction requires the new bridge.'
      );
    const input =
      this.state.parentElement?.closest('.ui-panel')?.querySelector<HTMLInputElement>(COMMAND) ||
      this.element.querySelector<HTMLInputElement>(COMMAND);
    const output =
      this.state.parentElement?.closest('.ui-panel')?.querySelector<HTMLInputElement>(RESPONSE) ||
      this.element.querySelector<HTMLInputElement>(RESPONSE);
    if (!input || !output) throw new Error('Map bridge controls are unavailable.');
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const timer = setInterval(() => {
        if (!input.isConnected || Date.now() - started > 20000) {
          clearInterval(timer);
          reject(
            new Error(
              'Native map operation timed out/disconnected. It may have executed; inspect native layers before retrying.'
            )
          );
          return;
        }
        try {
          const response = JSON.parse(output.value);
          if (response.id !== id) return;
          clearInterval(timer);
          if (response.success) resolve(response.result);
          else reject(new Error(response.error || 'Native map operation failed.'));
        } catch {
          /* Wait for a complete response. */
        }
      }, 30);
      input.value = JSON.stringify({ id, mapId: view.mapId, action, args });
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
}
