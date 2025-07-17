import { useState, useEffect } from 'react';

interface OnboardingState {
  hasSeenOnboarding: boolean;
  completedSteps: string[];
  skippedAt?: string;
  completedAt?: string;
}

const ONBOARDING_STORAGE_KEY = 'tripsync-onboarding';

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(() => {
    const saved = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing onboarding state:', e);
      }
    }
    return {
      hasSeenOnboarding: false,
      completedSteps: []
    };
  });

  const updateState = (newState: Partial<OnboardingState>) => {
    const updated = { ...state, ...newState };
    setState(updated);
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(updated));
  };

  const shouldShowOnboarding = () => {
    return !state.hasSeenOnboarding;
  };

  const completeOnboarding = () => {
    updateState({
      hasSeenOnboarding: true,
      completedAt: new Date().toISOString()
    });
  };

  const skipOnboarding = () => {
    updateState({
      hasSeenOnboarding: true,
      skippedAt: new Date().toISOString()
    });
  };

  const resetOnboarding = () => {
    setState({
      hasSeenOnboarding: false,
      completedSteps: []
    });
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  };

  const markStepCompleted = (stepId: string) => {
    if (!state.completedSteps.includes(stepId)) {
      updateState({
        completedSteps: [...state.completedSteps, stepId]
      });
    }
  };

  return {
    state,
    shouldShowOnboarding,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
    markStepCompleted
  };
}