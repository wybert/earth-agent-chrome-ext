import React from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WelcomeModalProps {
  onStart: () => void;
  onSkip: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ onStart, onSkip }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-md w-full mx-4 p-6"
      >
        {/* Close button */}
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-full p-3">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-gray-100">
          Welcome to Earth Agent!
        </h2>

        {/* Description */}
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
          Your AI assistant for Google Earth Engine
        </p>

        {/* Features */}
        <div className="space-y-3 mb-6">
          <FeatureItem icon="✓" text="Write Earth Engine code" />
          <FeatureItem icon="✓" text="Search and use datasets" />
          <FeatureItem icon="✓" text="Debug and optimize code" />
          <FeatureItem icon="✓" text="Visualize geospatial data" />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onSkip} className="flex-1">
            Skip
          </Button>
          <Button
            onClick={onStart}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
          >
            Start Tour
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

interface FeatureItemProps {
  icon: string;
  text: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, text }) => (
  <div className="flex items-center gap-3">
    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
      <span className="text-green-600 dark:text-green-400 text-sm font-semibold">{icon}</span>
    </div>
    <span className="text-gray-700 dark:text-gray-300">{text}</span>
  </div>
);
