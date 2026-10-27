// A synthetic map fixture for real Chrome input/layout tests. Not a GEE integration test.
import { dispatchMapAction, disposeMapRuntime } from '../src/content/map/runtime';
import { getGeeMapBridgeSource } from '../src/lib/map/gee-bridge-source';

const map = document.createElement('div');
map.className = 'ui-map';
Object.assign(map.style, {
  position: 'absolute',
  left: '100px',
  top: '120px',
  width: '800px',
  height: '500px',
  background: '#e8eef4',
});
const state = document.createElement('input');
state.placeholder = 'earth-agent-map-state-v1';
state.hidden = true;
map.append(state);
document.body.append(map);
let pointerCount = 0;
map.addEventListener('pointerdown', () => {
  pointerCount++;
});
let sequence = 0;
const pan = (center = [0, 0]) => {
  state.value = JSON.stringify({
    mapId: 'browser-fixture',
    revision: ++sequence,
    ready: true,
    center,
    zoom: 4,
    bounds: [-40, -20, 40, 20],
    projection: 'EPSG:3857',
    heading: 0,
    tilt: 0,
  });
};
pan();
(window as any).mapTest = {
  dispatch: dispatchMapAction,
  pan,
  dispose: disposeMapRuntime,
  setup: getGeeMapBridgeSource(),
  pointerCount: () => pointerCount,
};
