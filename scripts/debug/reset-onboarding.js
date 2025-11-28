/**
 * Reset Onboarding Script
 *
 * This script resets the onboarding state in Chrome storage.
 * Run this in the browser console (on the extension's sidepanel page)
 * to test the onboarding flow again.
 *
 * Usage:
 * 1. Open the extension's sidepanel
 * 2. Right-click → Inspect
 * 3. Paste this script in the console
 * 4. Press Enter
 * 5. Reload the page
 */

(function resetOnboarding() {
  const ONBOARDING_KEYS = [
    'earth_agent_onboarding_completed',
    'earth_agent_onboarding_dismissed',
    'earth_agent_onboarding_step',
    'earth_agent_onboarding_last_shown',
  ];

  console.log('🔄 Resetting onboarding state...');

  chrome.storage.local.remove(ONBOARDING_KEYS, () => {
    if (chrome.runtime.lastError) {
      console.error('❌ Error resetting onboarding:', chrome.runtime.lastError);
      return;
    }

    console.log('✅ Onboarding state reset successfully!');
    console.log('📝 Removed keys:', ONBOARDING_KEYS);
    console.log('🔃 Reloading page in 1 second...');

    setTimeout(() => {
      location.reload();
    }, 1000);
  });
})();
