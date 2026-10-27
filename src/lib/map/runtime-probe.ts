/**
 * Read-only, bounded capability discovery in the page MAIN world.
 * Self-contained for chrome.scripting serialization. Never executes editor code,
 * calls discovered functions/getters, or returns object values, scripts or tokens.
 * A candidate is structural evidence only, not a verified supported API.
 */
export function probeGeePageRuntime() {
  if (location.hostname !== 'code.earthengine.google.com')
    throw new Error('Runtime probe is restricted to the GEE Code Editor.');
  const interesting =
    /^(Map|ui|ee|google|goog|earthengine|app)$|earthengine|interpreter|drawingtools/i;
  const sensitive =
    /token|secret|password|credential|cookie|auth|storage|editor|script|source|code/i;
  const methods = [
    'getBounds',
    'getCenter',
    'getZoom',
    'drawingTools',
    'layers',
    'setSelected',
    'draw',
    'edit',
  ];
  const globalNames = Object.getOwnPropertyNames(window)
    .filter((name) => interesting.test(name))
    .slice(0, 60);
  function ownValue(object: any, key: string): any {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(object, key);
      return descriptor && 'value' in descriptor ? descriptor.value : undefined;
    } catch {
      return undefined;
    }
  }
  function methodNames(object: any) {
    const found: string[] = [];
    let current = object;
    for (let depth = 0; current && depth < 5; depth++) {
      for (const name of methods)
        if (!found.includes(name) && typeof ownValue(current, name) === 'function')
          found.push(name);
      try {
        current = Object.getPrototypeOf(current);
      } catch {
        break;
      }
    }
    return found;
  }
  const queue: Array<{ value: any; path: string; depth: number }> = [];
  const globals = globalNames.map((name) => {
    const value = ownValue(window, name);
    if (value && (typeof value === 'object' || typeof value === 'function'))
      queue.push({ value, path: 'window.' + name, depth: 0 });
    return { name, type: typeof value, methods: value ? methodNames(value) : [] };
  });
  const containers = Array.from(document.querySelectorAll('.ui-map'))
    .slice(0, 10)
    .map((element, index) => {
      const keys = Object.getOwnPropertyNames(element)
        .filter((key) => !sensitive.test(key))
        .slice(0, 40);
      for (const key of keys) {
        const value = ownValue(element, key);
        if (value && typeof value === 'object')
          queue.push({ value, path: 'map[' + index + '].' + key, depth: 0 });
      }
      const rect = element.getBoundingClientRect();
      return { index, width: rect.width, height: rect.height, ownPropertyNames: keys };
    });
  const candidates: Array<{ path: string; type: string; methods: string[] }> = [];
  const seen = new Set<any>();
  let inspected = 0;
  let cursor = 0;
  while (cursor < queue.length && inspected < 400) {
    const { value, path, depth } = queue[cursor++];
    if (seen.has(value) || value === window || value === document) continue;
    seen.add(value);
    inspected++;
    const available = methodNames(value);
    if (
      available.includes('drawingTools') ||
      available.includes('setSelected') ||
      (available.includes('getBounds') && available.includes('getZoom'))
    )
      candidates.push({ path, type: typeof value, methods: available });
    if (depth >= 3 || queue.length >= 1000) continue;
    let keys: string[];
    try {
      keys = Object.getOwnPropertyNames(value).slice(0, 80);
    } catch {
      continue;
    }
    for (const key of keys) {
      if (
        sensitive.test(key) ||
        ['window', 'document', 'parent', 'top', 'ownerDocument'].includes(key)
      )
        continue;
      const child = ownValue(value, key);
      if (child && (typeof child === 'object' || typeof child === 'function'))
        queue.push({ value: child, path: path + '.' + key, depth: depth + 1 });
      if (queue.length >= 1000) break;
    }
  }
  return {
    readOnly: true,
    bridgePresent: !!document.querySelector('input[placeholder="earth-agent-map-state-v1"]'),
    globals,
    containers,
    candidates,
    inspected,
    truncated: cursor < queue.length,
    limitation:
      'Bounded structural scan only. No candidate methods were invoked; absence does not prove no possible integration. Constructor prototypes are not live map instances.',
  };
}
