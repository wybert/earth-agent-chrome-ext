import React from 'react';
import { Progress } from '@/components/ui/progress';
import { getModelContextLimit } from '@/constants/model-limits';

interface TokenUsageDisplayProps {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  maxTokens?: number; // Optional max tokens for the model
  model?: string; // Model identifier to automatically determine max tokens
}

export const TokenUsageDisplay = React.memo(function TokenUsageDisplay({
  promptTokens,
  completionTokens,
  totalTokens,
  maxTokens,
  model,
}: TokenUsageDisplayProps) {
  // Determine the effective max tokens
  // Priority: explicit maxTokens prop > model-based lookup > default 128k
  const effectiveMaxTokens = maxTokens || (model ? getModelContextLimit(model) : 128000);
  // Debug logging
  console.log('🔍 [TokenUsageDisplay] Rendering with:', {
    promptTokens,
    completionTokens,
    totalTokens,
    model,
    maxTokens: effectiveMaxTokens
  });

  const percentage = (totalTokens / effectiveMaxTokens) * 100;

  // Determine color based on usage
  const getColor = () => {
    if (percentage >= 90) return 'text-red-600 dark:text-red-400';
    if (percentage >= 70) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getProgressColor = () => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-orange-500';
    return 'bg-green-500';
  };

  // Format numbers with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  // Only show when usage is >= 90% or explicitly requested
  // This keeps the UI clean and only alerts when approaching limits
  if (totalTokens === 0 || percentage < 90) {
    return null;
  }

  return (
    <div className="flex-none px-4 py-2 border-t bg-muted/30">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            Tokens: <span className={`font-medium ${getColor()}`}>{formatNumber(totalTokens)}</span> / {formatNumber(effectiveMaxTokens)}
          </span>
          <span className="text-muted-foreground">
            ({formatNumber(promptTokens)} in + {formatNumber(completionTokens)} out)
          </span>
        </div>
        <span className={`font-medium ${getColor()}`}>
          {percentage.toFixed(1)}%
        </span>
      </div>
      <Progress
        value={percentage}
        className="h-1.5"
        indicatorClassName={getProgressColor()}
      />
      {percentage >= 100 && (
        <div className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-semibold">
          🚨 Context limit exceeded! Start a new session or switch to a larger model.
        </div>
      )}
      {percentage >= 90 && percentage < 100 && (
        <div className="mt-1.5 text-xs text-red-600 dark:text-red-400">
          ⚠️ Very close to limit! Consider starting a new session soon.
        </div>
      )}
      {percentage >= 80 && percentage < 90 && (
        <div className="mt-1.5 text-xs text-orange-600 dark:text-orange-400">
          ⚠️ Approaching context limit - consider starting a new session
        </div>
      )}
    </div>
  );
});
