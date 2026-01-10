/**
 * DOM helpers extracted for testing.
 */
export function showClickIndicator(x: number, y: number): void {
  try {
    if (!document.body) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => showClickIndicator(x, y), {
          once: true,
        });
        return;
      }
      return;
    }

    const indicator = document.createElement('div');
    indicator.className = 'earth-agent-click-indicator';
    indicator.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: 32px;
      height: 32px;
      margin-left: -16px;
      margin-top: -16px;
      background: radial-gradient(circle, rgba(255,0,0,0.9) 0%, rgba(255,0,0,0.6) 40%, rgba(255,100,100,0.3) 70%, transparent 100%);
      border: 4px solid #ff0000;
      border-radius: 50%;
      pointer-events: none;
      z-index: 2147483647;
      box-shadow: 0 0 20px rgba(255,0,0,0.8), 0 0 40px rgba(255,0,0,0.4);
      animation: clickPulse 2s ease-in-out;
    `;

    // Add keyframe animation once
    if (!document.getElementById('click-indicator-style')) {
      const style = document.createElement('style');
      style.id = 'click-indicator-style';
      style.textContent = `
        @keyframes clickPulse {
          0% { transform: scale(0.3); opacity: 0; }
          10% { transform: scale(1.3); opacity: 1; }
          50% { transform: scale(1); opacity: 0.9; }
          90% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(0.8); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(indicator);

    // Remove indicator after animation completes (2 seconds)
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.remove();
      }
    }, 2000);
  } catch (error) {
    // Swallow errors to avoid breaking content script
  }
}
