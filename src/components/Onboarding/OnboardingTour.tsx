import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, ArrowRight } from 'lucide-react';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector or data attribute
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void; // Optional action to perform when step is shown
}

interface OnboardingTourProps {
  steps: OnboardingStep[];
  currentStep: number;
  onNext: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  steps,
  currentStep,
  onNext,
  onSkip,
  onComplete,
}) => {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  useEffect(() => {
    if (!step) return;

    // Execute step action if provided
    if (step.action) {
      step.action();
    }

    const updatePosition = () => {
      // Find target element
      const targetElement = document.querySelector(step.target);
      if (!targetElement) {
        console.warn(`Onboarding: Target element not found: ${step.target}`);
        return;
      }

      // Get element position
      const rect = targetElement.getBoundingClientRect();
      setTargetRect(rect);

      // Calculate tooltip position with boundary checking
      const style = calculateTooltipStyle(rect, step.position || 'bottom');
      setTooltipStyle(style);
    };

    // Initial position
    updatePosition();

    // Scroll element into view
    const targetElement = document.querySelector(step.target);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Add resize listener to update position when window/panel size changes
    const handleResize = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleResize);

    // Also listen for potential panel resize events
    const resizeObserver = new ResizeObserver(() => {
      updatePosition();
    });

    const panelRoot = document.documentElement;
    if (panelRoot) {
      resizeObserver.observe(panelRoot);
    }

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [step]);

  const calculateTooltipStyle = (
    rect: DOMRect,
    preferredPosition: 'top' | 'bottom' | 'left' | 'right'
  ): React.CSSProperties => {
    const OFFSET = 16; // Gap between target and tooltip
    const PADDING = 20; // Padding from viewport edges
    const MIN_WIDTH = 280;
    const MAX_WIDTH = 360;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate safe width
    const safeWidth = Math.min(MAX_WIDTH, viewportWidth - PADDING * 2);
    const width = Math.max(MIN_WIDTH, safeWidth);

    const style: React.CSSProperties = {
      width: `${width}px`,
      maxWidth: `${viewportWidth - PADDING * 2}px`,
    };

    // Calculate position based on preference
    if (preferredPosition === 'bottom' || preferredPosition === 'top') {
      // Vertical positioning
      if (preferredPosition === 'bottom') {
        const spaceBelow = viewportHeight - rect.bottom - OFFSET;
        if (spaceBelow > 200) {
          // Enough space below
          style.top = `${rect.bottom + OFFSET}px`;
        } else {
          // Not enough space, position above
          style.bottom = `${viewportHeight - rect.top + OFFSET}px`;
        }
      } else {
        // Position above
        const spaceAbove = rect.top - OFFSET;
        if (spaceAbove > 200) {
          style.bottom = `${viewportHeight - rect.top + OFFSET}px`;
        } else {
          // Not enough space above, position below
          style.top = `${rect.bottom + OFFSET}px`;
        }
      }

      // Horizontal centering with boundary check
      const centerX = rect.left + rect.width / 2;
      const tooltipLeft = centerX - width / 2;
      const tooltipRight = tooltipLeft + width;

      if (tooltipLeft < PADDING) {
        // Overflow left, align to left edge
        style.left = `${PADDING}px`;
      } else if (tooltipRight > viewportWidth - PADDING) {
        // Overflow right, align to right edge
        style.right = `${PADDING}px`;
      } else {
        // Center on target
        style.left = `${tooltipLeft}px`;
      }
    } else {
      // Horizontal positioning (left/right)
      if (preferredPosition === 'right') {
        const spaceRight = viewportWidth - rect.right - OFFSET;
        if (spaceRight > width) {
          style.left = `${rect.right + OFFSET}px`;
        } else {
          // Not enough space right, position left
          style.right = `${viewportWidth - rect.left + OFFSET}px`;
        }
      } else {
        // Position left
        const spaceLeft = rect.left - OFFSET;
        if (spaceLeft > width) {
          style.right = `${viewportWidth - rect.left + OFFSET}px`;
        } else {
          // Not enough space left, position right
          style.left = `${rect.right + OFFSET}px`;
        }
      }

      // Vertical centering with boundary check
      const centerY = rect.top + rect.height / 2;
      const estimatedHeight = 220;
      const tooltipTop = centerY - estimatedHeight / 2;
      const tooltipBottom = tooltipTop + estimatedHeight;

      if (tooltipTop < PADDING) {
        // Overflow top
        style.top = `${PADDING}px`;
      } else if (tooltipBottom > viewportHeight - PADDING) {
        // Overflow bottom
        style.bottom = `${PADDING}px`;
      } else {
        // Center on target
        style.top = `${tooltipTop}px`;
      }
    }

    return style;
  };

  if (!step || !targetRect) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Backdrop overlay with cutout for highlighted element */}
      <div className="absolute inset-0 pointer-events-auto">
        <svg className="w-full h-full">
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - 4}
                y={targetRect.top - 4}
                width={targetRect.width + 8}
                height={targetRect.height + 8}
                rx="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.7)"
            mask="url(#spotlight-mask)"
          />
        </svg>
      </div>

      {/* Highlight ring around target */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute pointer-events-none"
        style={{
          top: targetRect.top - 4,
          left: targetRect.left - 4,
          width: targetRect.width + 8,
          height: targetRect.height + 8,
        }}
      >
        <div className="w-full h-full border-2 border-blue-500 rounded-lg shadow-lg shadow-blue-500/50 animate-pulse" />
      </motion.div>

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="absolute bg-white dark:bg-gray-900 rounded-lg shadow-2xl p-6 pointer-events-auto"
          style={tooltipStyle}
        >
          {/* Close button */}
          <button
            onClick={onSkip}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors z-10"
            aria-label="Skip tour"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-3">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-8 bg-blue-500'
                    : index < currentStep
                      ? 'w-1.5 bg-blue-300'
                      : 'w-1.5 bg-gray-300 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100 pr-6">
            {step.title}
          </h3>

          {/* Description */}
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4 space-y-1">
            {step.description
              .split('\n')
              .filter((line) => line.trim())
              .map((line, index) => (
                <p key={index} className="leading-relaxed">
                  {line}
                </p>
              ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={onSkip}>
              Skip
            </Button>
            <Button
              size="sm"
              onClick={isLastStep ? onComplete : onNext}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              {isLastStep ? 'Finish' : 'Next'}
              {!isLastStep && <ArrowRight className="ml-1 h-4 w-4" />}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
