/**
 * Check Onboarding Status Script
 *
 * This script checks the current onboarding state and provides detailed information.
 * Run this in the browser console (on the extension's sidepanel page).
 */

(function checkOnboardingStatus() {
  const ONBOARDING_KEYS = [
    'earth_agent_onboarding_completed',
    'earth_agent_onboarding_dismissed',
    'earth_agent_onboarding_step',
    'earth_agent_onboarding_last_shown',
  ];

  console.log('🔍 Checking onboarding status...');

  chrome.storage.local.get(ONBOARDING_KEYS, (result) => {
    if (chrome.runtime.lastError) {
      console.error('❌ Error reading storage:', chrome.runtime.lastError);
      return;
    }

    console.log('\n📊 Current Onboarding State:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    Object.keys(result).forEach((key) => {
      const value = result[key];
      const icon = value ? '✅' : '❌';
      console.log(`${icon} ${key}: ${JSON.stringify(value)}`);
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Determine what should be shown
    const completed = result['earth_agent_onboarding_completed'] || false;
    const dismissed = result['earth_agent_onboarding_dismissed'] || false;

    if (!completed && !dismissed) {
      console.log('✅ Onboarding SHOULD be shown (neither completed nor dismissed)');
      console.log("💡 If you don't see it, try refreshing the page");
    } else {
      console.log('ℹ️  Onboarding is hidden because:');
      if (completed) console.log('   - Already completed');
      if (dismissed) console.log('   - User dismissed it');
      console.log('\n💡 To reset and see onboarding again, run:');
      console.log('   copy(resetOnboarding) then paste in console');
    }

    console.log('\n📝 To reset onboarding, copy and run this:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`
chrome.storage.local.remove([
  'earth_agent_onboarding_completed',
  'earth_agent_onboarding_dismissed',
  'earth_agent_onboarding_step',
  'earth_agent_onboarding_last_shown'
], () => {
  console.log('✅ Reset complete!');
  location.reload();
});
    `);
  });
})();
