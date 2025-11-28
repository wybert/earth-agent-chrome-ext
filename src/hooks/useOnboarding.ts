import { useState, useEffect, useCallback } from 'react';
import type { OnboardingStep } from '@/components/Onboarding/OnboardingTour';

const STORAGE_KEYS = {
  COMPLETED: 'earth_agent_onboarding_completed',
  DISMISSED: 'earth_agent_onboarding_dismissed',
  CURRENT_STEP: 'earth_agent_onboarding_step',
  LAST_SHOWN: 'earth_agent_onboarding_last_shown',
};

interface UseOnboardingReturn {
  showWelcome: boolean;
  showTour: boolean;
  currentStep: number;
  steps: OnboardingStep[];
  startTour: () => void;
  nextStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  resetOnboarding: () => void;
}

export const useOnboarding = (): UseOnboardingReturn => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Define onboarding steps
  const steps: OnboardingStep[] = [
    {
      id: 'settings',
      title: 'Configure API Key',
      description: 'First, set up your API key here\n\nSupported: OpenAI, Anthropic, Google, Qwen, Ollama',
      target: '[data-onboarding="settings-button"]',
      position: 'bottom',
    },
    {
      id: 'mode',
      title: 'Ask Mode vs Do Mode',
      description: 'Ask Mode: AI provides suggestions (read-only)\nDo Mode: AI executes code directly\n\n💡 Recommended for beginners: Do Mode',
      target: '[data-onboarding="mode-selector"]',
      position: 'top',
    },
    {
      id: 'input',
      title: 'Start Chatting',
      description: 'Type your questions here\n\nTry these examples:\n"Show Landsat 8 imagery for San Francisco"\n"Calculate NDVI for California"',
      target: '[data-onboarding="chat-input"]',
      position: 'top',
    },
    {
      id: 'help',
      title: 'Get Help',
      description: 'Click here to access documentation\n\nIncludes guides, code examples, and FAQs',
      target: '[data-onboarding="help-button"]',
      position: 'bottom',
    },
  ];

  // Check if onboarding should be shown on mount
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const result = await chrome.storage.local.get([
          STORAGE_KEYS.COMPLETED,
          STORAGE_KEYS.DISMISSED,
        ]);

        const completed = result[STORAGE_KEYS.COMPLETED] || false;
        const dismissed = result[STORAGE_KEYS.DISMISSED] || false;

        console.log('🔍 [Onboarding] Status check:', {
          completed,
          dismissed,
          shouldShow: !completed && !dismissed
        });

        // Show welcome modal if not completed and not dismissed
        if (!completed && !dismissed) {
          console.log('✅ [Onboarding] Showing welcome modal');
          setShowWelcome(true);
        } else {
          console.log('ℹ️ [Onboarding] Not showing (completed or dismissed)');
        }
      } catch (error) {
        console.error('❌ [Onboarding] Failed to check status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  const startTour = useCallback(() => {
    setShowWelcome(false);
    setShowTour(true);
    setCurrentStep(0);
    chrome.storage.local.set({
      [STORAGE_KEYS.CURRENT_STEP]: 0,
      [STORAGE_KEYS.LAST_SHOWN]: Date.now(),
    });
  }, []);

  const nextStep = useCallback(() => {
    const next = currentStep + 1;
    if (next < steps.length) {
      setCurrentStep(next);
      chrome.storage.local.set({ [STORAGE_KEYS.CURRENT_STEP]: next });
    } else {
      completeTour();
    }
  }, [currentStep, steps.length]);

  const skipTour = useCallback(() => {
    setShowWelcome(false);
    setShowTour(false);
    chrome.storage.local.set({
      [STORAGE_KEYS.DISMISSED]: true,
      [STORAGE_KEYS.LAST_SHOWN]: Date.now(),
    });
  }, []);

  const completeTour = useCallback(() => {
    setShowTour(false);
    chrome.storage.local.set({
      [STORAGE_KEYS.COMPLETED]: true,
      [STORAGE_KEYS.LAST_SHOWN]: Date.now(),
    });
  }, []);

  const resetOnboarding = useCallback(() => {
    chrome.storage.local.remove([
      STORAGE_KEYS.COMPLETED,
      STORAGE_KEYS.DISMISSED,
      STORAGE_KEYS.CURRENT_STEP,
      STORAGE_KEYS.LAST_SHOWN,
    ]);
    setShowWelcome(true);
    setShowTour(false);
    setCurrentStep(0);
  }, []);

  return {
    showWelcome: showWelcome && !isLoading,
    showTour,
    currentStep,
    steps,
    startTour,
    nextStep,
    skipTour,
    completeTour,
    resetOnboarding,
  };
};
