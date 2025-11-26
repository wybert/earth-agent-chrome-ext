import { showClickIndicator } from './dom-helpers';

describe('showClickIndicator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('injects indicator and style, then removes after timeout', () => {
    showClickIndicator(100, 200);

    const indicator = document.querySelector('.earth-agent-click-indicator') as HTMLElement;
    expect(indicator).not.toBeNull();
    expect(indicator.style.left).toBe('100px');
    expect(indicator.style.top).toBe('200px');

    const style = document.getElementById('click-indicator-style');
    expect(style).not.toBeNull();
    expect(style?.textContent).toContain('@keyframes clickPulse');

    jest.runAllTimers();
    expect(document.querySelector('.earth-agent-click-indicator')).toBeNull();
  });

  it('bails when no body and document is loading', () => {
    Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true });
    const addListenerSpy = jest.spyOn(document, 'addEventListener');
    // remove body to simulate missing
    const originalBody = document.body;
    Object.defineProperty(document, 'body', { value: null, configurable: true });

    showClickIndicator(0, 0);
    expect(addListenerSpy).toHaveBeenCalled();

    // restore body/readyState
    Object.defineProperty(document, 'body', { value: originalBody, configurable: true });
    Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
  });
});
