// Jest global setup for Chrome extension tests
// Provides a minimal chrome mock and enables fetch mocking.

const fetchMock = require('jest-fetch-mock');

fetchMock.enableMocks();

// Silence noisy console output during tests
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});

// Polyfill setImmediate for jsdom environment
if (typeof setImmediate === 'undefined') {
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
}

// Polyfill TextEncoder/TextDecoder for streaming tests
if (typeof TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Polyfill TransformStream for ai-sdk deps in jsdom
if (typeof TransformStream === 'undefined') {
  const { TransformStream } = require('stream/web');
  global.TransformStream = TransformStream;
}

const makePort = () => ({
  name: 'test-port',
  onMessage: { addListener: jest.fn(), removeListener: jest.fn() },
  postMessage: jest.fn(),
  disconnect: jest.fn(),
});

global.chrome = {
  runtime: {
    id: 'test-extension-id',
    lastError: null,
    onMessage: { addListener: jest.fn(), removeListener: jest.fn() },
    onConnect: { addListener: jest.fn(), removeListener: jest.fn() },
    sendMessage: jest.fn(),
    connect: jest.fn(() => makePort()),
  },
  tabs: {
    query: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    reload: jest.fn(),
    sendMessage: jest.fn(),
  },
  windows: {
    update: jest.fn(),
  },
  sidePanel: {
    setOptions: jest.fn((options, cb) => cb && cb()),
    open: jest.fn((opts, cb) => cb && cb()),
  },
  action: {
    onClicked: { addListener: jest.fn() },
  },
  scripting: {
    executeScript: jest.fn(),
  },
  storage: {
    local: {
      get: jest.fn(() => Promise.resolve({})),
      set: jest.fn(() => Promise.resolve()),
      remove: jest.fn(() => Promise.resolve()),
    },
    sync: {
      get: jest.fn((keys, cb) => cb && cb({})),
      set: jest.fn((data, cb) => cb && cb()),
      remove: jest.fn((keys, cb) => cb && cb()),
    },
  },
};
