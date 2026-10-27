/** @jest-environment-options {"url":"https://code.earthengine.google.com/"} */
import { probeGeePageRuntime } from './runtime-probe';

afterEach(() => {
  delete (window as any).earthengine;
  document.body.replaceChildren();
});
it('discovers structural candidates without a setup bridge or invoking their methods/getters', () => {
  const getter = jest.fn(() => {
    throw new Error('must not invoke getter');
  });
  const getBounds = jest.fn();
  const map = { getBounds, getZoom: jest.fn(), drawingTools: jest.fn() };
  const root = { currentMap: map, token: 'DO_NOT_RETURN', editor: { secretText: 'PRIVATE_CODE' } };
  Object.defineProperty(root, 'sensitiveGetter', { get: getter });
  (window as any).earthengine = root;
  const result = probeGeePageRuntime();
  expect(result.bridgePresent).toBe(false);
  expect(result.candidates).toContainEqual({
    path: 'window.earthengine.currentMap',
    type: 'object',
    methods: ['getBounds', 'getZoom', 'drawingTools'],
  });
  expect(getter).not.toHaveBeenCalled();
  expect(getBounds).not.toHaveBeenCalled();
  expect(JSON.stringify(result)).not.toMatch(/DO_NOT_RETURN|PRIVATE_CODE/);
});
it('inspects DOM-attached map capabilities without creating or changing DOM nodes', () => {
  const element = document.createElement('div');
  element.className = 'ui-map';
  (element as any).component = { drawingTools() {} };
  document.body.append(element);
  const before = document.body.innerHTML;
  const result = probeGeePageRuntime();
  expect(result.containers).toHaveLength(1);
  expect(result.candidates.some((entry) => entry.path === 'map[0].component')).toBe(true);
  expect(document.body.innerHTML).toBe(before);
});
it('bounds cyclic object traversal and remains self-contained when serialized', () => {
  const root: any = {};
  root.self = root;
  for (let i = 0; i < 80; i++)
    root['item' + i] = Object.fromEntries(Array.from({ length: 80 }, (_, j) => ['item' + j, {}]));
  (window as any).earthengine = root;
  const result = probeGeePageRuntime();
  expect(result.inspected).toBeLessThanOrEqual(400);
  expect(result.truncated).toBe(true);
  const standalone = new Function('return (' + probeGeePageRuntime.toString() + ')()');
  expect(standalone().readOnly).toBe(true);
});
