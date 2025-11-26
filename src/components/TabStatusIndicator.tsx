import React, { useEffect, useState } from 'react';

interface TabStatus {
  hasGEETab: boolean;
  isActiveTab: boolean;
  selectedTabId?: number;
  selectedTabTitle?: string;
  selectedTabUrl?: string;
  activeTabTitle?: string;
  activeTabUrl?: string;
  totalGEETabs?: number;
}

export function TabStatusIndicator() {
  const [status, setStatus] = useState<TabStatus | null>(null);

  useEffect(() => {
    console.log('[TabStatusIndicator] Component mounted');

    // Function to fetch tab status
    const fetchTabStatus = () => {
      console.log('[TabStatusIndicator] Fetching tab status...');

      // Check if chrome.runtime is available
      if (!chrome || !chrome.runtime) {
        console.error('[TabStatusIndicator] chrome.runtime is not available');
        setStatus({
          hasGEETab: false,
          isActiveTab: false
        });
        return;
      }

      try {
        chrome.runtime.sendMessage(
          { type: 'GET_TARGET_TAB_STATUS' },
          (response) => {
            // Check for errors
            if (chrome.runtime.lastError) {
              console.error('[TabStatusIndicator] Error:', chrome.runtime.lastError);
              setStatus({
                hasGEETab: false,
                isActiveTab: false
              });
              return;
            }

            console.log('[TabStatusIndicator] Response received:', response);

            if (response && response.success) {
              console.log('[TabStatusIndicator] Status updated:', {
                hasGEETab: response.hasGEETab,
                isActiveTab: response.isActiveTab,
                selectedTabId: response.selectedTabId
              });

              setStatus({
                hasGEETab: response.hasGEETab,
                isActiveTab: response.isActiveTab,
                selectedTabId: response.selectedTabId,
                selectedTabTitle: response.selectedTabTitle,
                selectedTabUrl: response.selectedTabUrl,
                activeTabTitle: response.activeTabTitle,
                activeTabUrl: response.activeTabUrl,
                totalGEETabs: response.totalGEETabs
              });
            } else {
              console.warn('[TabStatusIndicator] Response not successful:', response);
              setStatus({
                hasGEETab: false,
                isActiveTab: false
              });
            }
          }
        );
      } catch (error) {
        console.error('[TabStatusIndicator] Exception:', error);
        setStatus({
          hasGEETab: false,
          isActiveTab: false
        });
      }
    };

    // Fetch initially
    fetchTabStatus();

    // Poll every 2 seconds
    const interval = setInterval(fetchTabStatus, 2000);

    return () => {
      console.log('[TabStatusIndicator] Component unmounting');
      clearInterval(interval);
    };
  }, []);

  if (!status) {
    return null;
  }

  // Determine indicator icon and tooltip content
  let statusIcon = '🔴';
  let tooltipTitle = 'No GEE Tab';
  let tooltipDetails: string[] = [];
  let showLink = false;

  if (status.hasGEETab) {
    if (status.isActiveTab) {
      statusIcon = '🟢';
      tooltipTitle = 'Connected';
      tooltipDetails.push(`Targeting active tab`);
    } else {
      statusIcon = '🟡';
      tooltipTitle = 'Not Active';
      tooltipDetails.push(`Targeting different tab`);
    }

    // Add tab ID (concise)
    if (status.selectedTabId) {
      tooltipDetails.push(`ID: ${status.selectedTabId}`);
    }

    // Add total tabs count if multiple
    if (status.totalGEETabs !== undefined && status.totalGEETabs > 1) {
      tooltipDetails.push(`${status.totalGEETabs} GEE tabs open`);
    }
  } else {
    tooltipDetails.push('No GEE tab found');
    showLink = true;
  }

  return (
    <div className="relative group">
      {/* Indicator icon */}
      <div className="text-lg cursor-help flex items-center justify-center w-8 h-8">
        {statusIcon}
      </div>

      {/* Tooltip - appears on hover */}
      <div className="absolute left-1/2 -translate-x-1/2 top-10 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none group-hover:pointer-events-auto">
        <div className="bg-popover text-popover-foreground rounded-lg shadow-xl border border-border p-2.5">
          {/* Arrow */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-popover border-l border-t border-border transform rotate-45"></div>

          {/* Content */}
          <div className="relative">
            <div className="font-semibold text-sm mb-1.5 flex items-center gap-1.5">
              <span className="text-base">{statusIcon}</span>
              <span>{tooltipTitle}</span>
            </div>
            <div className="space-y-1">
              {tooltipDetails.map((detail, index) => (
                <div key={index} className="text-xs text-muted-foreground leading-snug">
                  {detail}
                </div>
              ))}
              {showLink && (
                <a
                  href="https://code.earthengine.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  Open GEE →
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
