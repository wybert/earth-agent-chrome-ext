import React from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from './button';

interface PermissionTipProps {
  onDismiss: () => void;
}

export function PermissionTip({ onDismiss }: PermissionTipProps) {
  return (
    <div className="mx-3 mt-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
      <div className="p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-full shrink-0">
        <Camera className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-amber-900 dark:text-amber-100">
          Screenshot Access Limited
        </h4>
        <p className="text-xs text-amber-800 dark:text-amber-200/80 mt-1 leading-relaxed">
          Chrome requires a manual click to authorize screenshots for new tabs.
        </p>
        <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mt-2">
          👉 Click the Earth Agent extension icon in your browser toolbar to enable full access.
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 -mt-1 -mr-1 text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/50"
        onClick={onDismiss}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
