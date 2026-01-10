import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Check, X, Eye, EyeOff, ExternalLink, Shield } from 'lucide-react';
import { type ApiProvider } from '@/constants/models';
import { OpenAICompatibleSection } from './OpenAICompatibleSection';
import type { AgentProfile, ToolKey } from '@/types/extension';
import {
  ACTIVE_PROFILE_ID_STORAGE_KEY,
  PROFILES_STORAGE_KEY,
  PROFILE_LIMITS,
  TOOL_CATALOG,
  createEmptyProfile,
  migrateProfiles,
} from '@/lib/profiles';
import { toast } from 'sonner';

// Storage keys
const OPENAI_API_KEY_STORAGE_KEY = 'earth_engine_openai_api_key';
const ANTHROPIC_API_KEY_STORAGE_KEY = 'earth_engine_anthropic_api_key';
const GOOGLE_API_KEY_STORAGE_KEY = 'earth_engine_google_api_key';
const Z_AI_API_KEY_STORAGE_KEY = 'earth_engine_z_ai_api_key';
const PROJECT_NAME_STORAGE_KEY = 'earth_engine_project_name';
const PROJECT_CONTEXT_STORAGE_KEY = 'earth_engine_project_context';
const MCP_ENABLED_STORAGE_KEY = 'earth_agent_mcp_enabled';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  // API Keys state
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [zAiApiKey, setZAiApiKey] = useState('');

  // Show/hide API keys
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [showZAiKey, setShowZAiKey] = useState(false);

  // Status
  const [saveStatus, setSaveStatus] = useState<
    Record<string, 'idle' | 'saving' | 'success' | 'error'>
  >({});
  const [saveMessage, setSaveMessage] = useState('');

  // Project Context state
  const [projectName, setProjectName] = useState('');
  const [projectContext, setProjectContext] = useState('');
  const [contextSaveStatus, setContextSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Profiles state (stored locally)
  const [profiles, setProfiles] = useState<AgentProfile[]>([]);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);

  // MCP State
  const [mcpEnabled, setMcpEnabled] = useState(true); // Default to true

  // Load all data on mount (with migration from local to sync)
  useEffect(() => {
    // Load all sync storage data
    chrome.storage.sync.get(
      [
        OPENAI_API_KEY_STORAGE_KEY,
        ANTHROPIC_API_KEY_STORAGE_KEY,
        GOOGLE_API_KEY_STORAGE_KEY,
        Z_AI_API_KEY_STORAGE_KEY,
        PROJECT_NAME_STORAGE_KEY,
        PROJECT_CONTEXT_STORAGE_KEY,
        PROFILES_STORAGE_KEY,
        PROJECT_NAME_STORAGE_KEY,
        PROJECT_CONTEXT_STORAGE_KEY,
        PROFILES_STORAGE_KEY,
        ACTIVE_PROFILE_ID_STORAGE_KEY,
      ],
      (syncResult) => {
        // Load local MCP setting
        chrome.storage.local.get([MCP_ENABLED_STORAGE_KEY], (localResult) => {
          setMcpEnabled(localResult[MCP_ENABLED_STORAGE_KEY] !== false); // Default true
        });

        // Set API keys
        setOpenaiApiKey(syncResult[OPENAI_API_KEY_STORAGE_KEY] || '');
        setAnthropicApiKey(syncResult[ANTHROPIC_API_KEY_STORAGE_KEY] || '');
        setGoogleApiKey(syncResult[GOOGLE_API_KEY_STORAGE_KEY] || '');
        setZAiApiKey(syncResult[Z_AI_API_KEY_STORAGE_KEY] || '');

        // Check if we need to migrate from local storage
        const hasProfilesInSync = syncResult[PROFILES_STORAGE_KEY] !== undefined;
        const hasContextInSync =
          syncResult[PROJECT_NAME_STORAGE_KEY] !== undefined ||
          syncResult[PROJECT_CONTEXT_STORAGE_KEY] !== undefined;

        if (hasProfilesInSync && hasContextInSync) {
          // Data already in sync, use it directly
          setProjectName(syncResult[PROJECT_NAME_STORAGE_KEY] || '');
          setProjectContext(syncResult[PROJECT_CONTEXT_STORAGE_KEY] || '');
          setProfiles(migrateProfiles(syncResult[PROFILES_STORAGE_KEY]));
          setActiveProfileId(syncResult[ACTIVE_PROFILE_ID_STORAGE_KEY] || null);
        } else {
          // Check local storage for data to migrate
          chrome.storage.local.get(
            [
              PROJECT_NAME_STORAGE_KEY,
              PROJECT_CONTEXT_STORAGE_KEY,
              PROFILES_STORAGE_KEY,
              ACTIVE_PROFILE_ID_STORAGE_KEY,
            ],
            (localResult) => {
              const localProjectName = localResult[PROJECT_NAME_STORAGE_KEY] || '';
              const localProjectContext = localResult[PROJECT_CONTEXT_STORAGE_KEY] || '';
              const localProfiles = migrateProfiles(localResult[PROFILES_STORAGE_KEY]);
              const localActiveProfileId = localResult[ACTIVE_PROFILE_ID_STORAGE_KEY] || null;

              // Use sync data if available, otherwise use local data
              const finalProjectName = syncResult[PROJECT_NAME_STORAGE_KEY] || localProjectName;
              const finalProjectContext =
                syncResult[PROJECT_CONTEXT_STORAGE_KEY] || localProjectContext;
              const finalProfiles = hasProfilesInSync
                ? migrateProfiles(syncResult[PROFILES_STORAGE_KEY])
                : localProfiles;
              const finalActiveProfileId = hasProfilesInSync
                ? syncResult[ACTIVE_PROFILE_ID_STORAGE_KEY] || null
                : localActiveProfileId;

              setProjectName(finalProjectName);
              setProjectContext(finalProjectContext);
              setProfiles(finalProfiles);
              setActiveProfileId(finalActiveProfileId);

              // Migrate local data to sync if there's data to migrate
              const dataToMigrate: Record<string, unknown> = {};
              if (!hasContextInSync && (localProjectName || localProjectContext)) {
                dataToMigrate[PROJECT_NAME_STORAGE_KEY] = localProjectName;
                dataToMigrate[PROJECT_CONTEXT_STORAGE_KEY] = localProjectContext;
              }
              if (!hasProfilesInSync && localProfiles.length > 0) {
                // Truncate profiles to fit sync limits
                const truncatedProfiles = localProfiles
                  .slice(0, PROFILE_LIMITS.MAX_PROFILES)
                  .map((p) => ({
                    ...p,
                    name: p.name.slice(0, PROFILE_LIMITS.MAX_NAME_LENGTH),
                    prompt: p.prompt.slice(0, PROFILE_LIMITS.MAX_PROMPT_LENGTH),
                  }));
                dataToMigrate[PROFILES_STORAGE_KEY] = truncatedProfiles;
                dataToMigrate[ACTIVE_PROFILE_ID_STORAGE_KEY] = localActiveProfileId;
              }

              if (Object.keys(dataToMigrate).length > 0) {
                chrome.storage.sync.set(dataToMigrate, () => {
                  if (chrome.runtime.lastError) {
                    console.error('Migration to sync storage failed:', chrome.runtime.lastError);
                  } else {
                    console.log('Successfully migrated data to sync storage');
                    // Clean up local storage after successful migration
                    chrome.storage.local.remove([
                      PROJECT_NAME_STORAGE_KEY,
                      PROJECT_CONTEXT_STORAGE_KEY,
                      PROFILES_STORAGE_KEY,
                      ACTIVE_PROFILE_ID_STORAGE_KEY,
                    ]);
                  }
                });
              }
            }
          );
        }
      }
    );
  }, []);

  const handleSaveApiKey = (provider: ApiProvider, apiKey: string) => {
    const trimmedApiKey = apiKey.trim();
    const storageData: { [key: string]: string } = {};

    setSaveStatus((prev) => ({ ...prev, [provider]: 'saving' }));

    // Store API key in the provider-specific key
    if (provider === 'openai') {
      storageData[OPENAI_API_KEY_STORAGE_KEY] = trimmedApiKey;
    } else if (provider === 'anthropic') {
      storageData[ANTHROPIC_API_KEY_STORAGE_KEY] = trimmedApiKey;
    } else if (provider === 'google') {
      storageData[GOOGLE_API_KEY_STORAGE_KEY] = trimmedApiKey;
    } else if (provider === 'z-ai') {
      storageData[Z_AI_API_KEY_STORAGE_KEY] = trimmedApiKey;
    }

    chrome.storage.sync.set(storageData, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving API key:', chrome.runtime.lastError);
        setSaveStatus((prev) => ({ ...prev, [provider]: 'error' }));
        toast.error(`Failed to save ${provider} API key`);
      } else {
        setSaveStatus((prev) => ({ ...prev, [provider]: 'success' }));
      }

      // Reset status after 2 seconds
      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, [provider]: 'idle' }));
      }, 2000);
    });
  };

  const handleSaveContext = () => {
    // Validate character limit
    if (projectContext.length > 2000) {
      setContextSaveStatus('error');
      setTimeout(() => setContextSaveStatus('idle'), 3000);
      return;
    }

    // Save to sync storage (syncs across devices)
    chrome.storage.sync.set(
      {
        [PROJECT_NAME_STORAGE_KEY]: projectName,
        [PROJECT_CONTEXT_STORAGE_KEY]: projectContext,
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error('Error saving project context:', chrome.runtime.lastError);
          setContextSaveStatus('error');
        } else {
          setContextSaveStatus('success');
        }

        // Reset status after 3 seconds
        setTimeout(() => {
          setContextSaveStatus('idle');
        }, 3000);
      }
    );
  };

  const handleClearContext = () => {
    // Clear project context without confirmation
    setProjectName('');
    setProjectContext('');

    // Clear from sync storage
    chrome.storage.sync.set(
      {
        [PROJECT_NAME_STORAGE_KEY]: '',
        [PROJECT_CONTEXT_STORAGE_KEY]: '',
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error('Error clearing project context:', chrome.runtime.lastError);
        }
      }
    );
  };

  const persistProfiles = (nextProfiles: AgentProfile[], nextActiveId: string | null) => {
    // Validate and truncate profiles to fit sync storage limits
    const truncatedProfiles = nextProfiles.slice(0, PROFILE_LIMITS.MAX_PROFILES).map((p) => ({
      ...p,
      name: p.name.slice(0, PROFILE_LIMITS.MAX_NAME_LENGTH),
      prompt: p.prompt.slice(0, PROFILE_LIMITS.MAX_PROMPT_LENGTH),
    }));

    chrome.storage.sync.set(
      {
        [PROFILES_STORAGE_KEY]: truncatedProfiles,
        [ACTIVE_PROFILE_ID_STORAGE_KEY]: nextActiveId,
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error('Error saving profiles:', chrome.runtime.lastError);
          toast.error('Failed to save profiles', {
            description: chrome.runtime.lastError.message,
          });
        }
      }
    );
  };

  const handleCreateProfile = () => {
    // Check profile limit
    if (profiles.length >= PROFILE_LIMITS.MAX_PROFILES) {
      toast.error(`Maximum ${PROFILE_LIMITS.MAX_PROFILES} profiles allowed`);
      return;
    }

    const newProfile = createEmptyProfile();
    setProfiles((prev) => {
      const next = [newProfile, ...prev];
      persistProfiles(next, activeProfileId);
      return next;
    });
    setEditingProfileId(newProfile.id);
  };

  const handleUpdateProfile = (profileId: string, patch: Partial<AgentProfile>) => {
    setProfiles((prev) => {
      const next = prev.map((p) =>
        p.id === profileId ? { ...p, ...patch, updatedAt: Date.now() } : p
      );
      persistProfiles(next, activeProfileId);
      return next;
    });
  };

  const handleDeleteProfile = (profileId: string) => {
    setProfiles((prev) => {
      const next = prev.filter((p) => p.id !== profileId);
      const nextActive = activeProfileId === profileId ? null : activeProfileId;
      setActiveProfileId(nextActive);
      persistProfiles(next, nextActive);
      return next;
    });
    setEditingProfileId((current) => (current === profileId ? null : current));
  };

  const toggleProfileTool = (profileId: string, tool: ToolKey) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;
    const has = profile.tools.includes(tool);
    const nextTools = has ? profile.tools.filter((t) => t !== tool) : [...profile.tools, tool];
    handleUpdateProfile(profileId, { tools: nextTools });
  };

  const handleToggleMCP = (enabled: boolean) => {
    setMcpEnabled(enabled);
    chrome.storage.local.set({ [MCP_ENABLED_STORAGE_KEY]: enabled }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving MCP setting:', chrome.runtime.lastError);
        // Revert UI if save failed
        setMcpEnabled(!enabled);
      }
    });
  };

  // Helper to render the status icon
  const renderStatusIcon = (provider: string) => {
    const status = saveStatus[provider];
    if (status === 'success') {
      return <Check className="h-4 w-4 text-green-500 animate-in fade-in zoom-in duration-300" />;
    }
    if (status === 'error') {
      return <X className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  return (
    <Card className="p-4 w-full h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="text-lg font-semibold">Settings</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4 overflow-y-auto flex-1 px-1 -mx-1">
        {/* Privacy Notice */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-2">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                Privacy & Your Data
              </h3>
              <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                By using Earth Agent, you agree to our data practices. All your data (API keys, chat
                history, settings) is stored locally on your device and never sent to our servers.
                Your messages are sent directly to your chosen AI provider.
              </p>
              <a
                href="https://github.com/wybert/earth-agent-ai-sdk/blob/main/PRIVACY_POLICY.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-medium transition-colors"
              >
                Read Privacy Policy
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        {/* API Keys Section */}
        <div className="pt-2">
          <h3 className="text-sm font-semibold mb-1">API Keys</h3>
          <p className="text-xs text-gray-500 mb-3">
            Your API keys are stored securely in Chrome's synced storage and are never sent to our
            servers. Keys are saved automatically when you click outside the field.
          </p>

          <div className="space-y-4">
            {/* OpenAI */}
            <div>
              <label className="text-sm mb-1 block">OpenAI API Key</label>
              <div className="relative">
                <Input
                  type={showOpenaiKey ? 'text' : 'password'}
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  onBlur={() => handleSaveApiKey('openai', openaiApiKey)}
                  placeholder="sk-..."
                  className="pr-16"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-2">
                  {renderStatusIcon('openai')}
                  <button
                    type="button"
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  >
                    {showOpenaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Anthropic */}
            <div>
              <label className="text-sm mb-1 block">Anthropic API Key</label>
              <div className="relative">
                <Input
                  type={showAnthropicKey ? 'text' : 'password'}
                  value={anthropicApiKey}
                  onChange={(e) => setAnthropicApiKey(e.target.value)}
                  onBlur={() => handleSaveApiKey('anthropic', anthropicApiKey)}
                  placeholder="sk-ant-..."
                  className="pr-16"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-2">
                  {renderStatusIcon('anthropic')}
                  <button
                    type="button"
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                  >
                    {showAnthropicKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Google */}
            <div>
              <label className="text-sm mb-1 block">Google API Key</label>
              <div className="relative">
                <Input
                  type={showGoogleKey ? 'text' : 'password'}
                  value={googleApiKey}
                  onChange={(e) => setGoogleApiKey(e.target.value)}
                  onBlur={() => handleSaveApiKey('google', googleApiKey)}
                  placeholder="AIza..."
                  className="pr-16"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-2">
                  {renderStatusIcon('google')}
                  <button
                    type="button"
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    onClick={() => setShowGoogleKey(!showGoogleKey)}
                  >
                    {showGoogleKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Z.AI */}
            <div>
              <label className="text-sm mb-1 block">
                Z.AI API Key{' '}
                <span className="text-xs text-muted-foreground">
                  (Text Only - No Screenshot Analysis)
                </span>
              </label>
              <div className="relative">
                <Input
                  type={showZAiKey ? 'text' : 'password'}
                  value={zAiApiKey}
                  onChange={(e) => setZAiApiKey(e.target.value)}
                  onBlur={() => handleSaveApiKey('z-ai', zAiApiKey)}
                  placeholder="sk-..."
                  className="pr-16"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-2">
                  {renderStatusIcon('z-ai')}
                  <button
                    type="button"
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    onClick={() => setShowZAiKey(!showZAiKey)}
                  >
                    {showZAiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t my-4"></div>

            {/* External Integrations */}
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold mb-3">External Integrations</h3>

              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">MCP Server</span>
                    <span className="bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                      Beta
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Allow external AI editors (Cursor, Claude Code) to control Earth Agent
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={mcpEnabled}
                      onChange={(e) => handleToggleMCP(e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* OpenAI Compatible Providers */}
            <OpenAICompatibleSection />

            {/* Status messages at bottom are removed in favor of inline icons */}
          </div>
        </div>

        {/* Project Context Section */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold mb-1">Project Context</h3>
          <div className="text-xs text-gray-500 mb-3">
            <p>ℹ️ These instructions will be applied to every chat message.</p>
            <p className="mt-1">Synced across your Chrome devices.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm mb-1 block">Project Name</label>
              <Input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name (optional)"
              />
            </div>

            <div>
              <label className="text-sm mb-1 block">Custom Instructions</label>
              <textarea
                value={projectContext}
                onChange={(e) => setProjectContext(e.target.value)}
                placeholder="Add project-specific context that will be included in every message...

Examples:
- Project background and goals
- Custom terminology and definitions
- Preferred coding styles or conventions
- Domain-specific knowledge"
                className="w-full h-[120px] px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                maxLength={2000}
              />
              <div className="flex items-center justify-between mt-1">
                <span
                  className={`text-xs ${projectContext.length > 1900 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500'}`}
                >
                  {projectContext.length}/2000 characters
                </span>
                {projectContext.length > 2000 && (
                  <span className="text-xs text-red-600 dark:text-red-400">
                    Character limit exceeded
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveContext} disabled={projectContext.length > 2000}>
                Save Context
              </Button>
              <Button
                onClick={handleClearContext}
                variant="outline"
                disabled={!projectName && !projectContext}
              >
                Clear
              </Button>
            </div>

            {contextSaveStatus === 'success' && (
              <div className="text-sm flex items-center text-green-600">
                <Check className="h-4 w-4 mr-1" /> Project context saved successfully
              </div>
            )}

            {contextSaveStatus === 'error' && (
              <div className="text-sm flex items-center text-red-600">
                <X className="h-4 w-4 mr-1" /> Error saving project context
              </div>
            )}
          </div>
        </div>

        {/* Profiles Section */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Profiles</h3>
            <Button size="sm" variant="outline" onClick={handleCreateProfile}>
              + New Profile
            </Button>
          </div>
          <div className="text-xs text-gray-500 mb-3">
            <p>Profiles customize prompts and tool access for the AI.</p>
            <p className="mt-1">Synced across your Chrome devices.</p>
          </div>

          <div className="space-y-3">
            {profiles.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                No custom profiles yet. Create one to show it in the Ask/Do menu.
              </div>
            ) : null}

            {profiles.map((profile) => {
              const isEditing = editingProfileId === profile.id;
              return (
                <div
                  key={profile.id}
                  className="rounded-md border border-gray-200 dark:border-gray-700 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate" title={profile.name}>
                          {profile.name}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {profile.tools.length} tool(s) enabled
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingProfileId(isEditing ? null : profile.id)}
                      >
                        {isEditing ? 'Close' : 'Edit'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteProfile(profile.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="text-sm mb-1 block">Profile Name</label>
                        <Input
                          type="text"
                          value={profile.name}
                          onChange={(e) =>
                            handleUpdateProfile(profile.id, { name: e.target.value })
                          }
                          placeholder="e.g. memory bank"
                        />
                      </div>

                      <div>
                        <label className="text-sm mb-1 block">Custom Prompt</label>
                        <textarea
                          value={profile.prompt}
                          onChange={(e) =>
                            handleUpdateProfile(profile.id, { prompt: e.target.value })
                          }
                          placeholder="Additional instructions appended to the system prompt..."
                          className="w-full h-[110px] px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                        />
                      </div>

                      <div>
                        <label className="text-sm mb-2 block">Allowed Tools</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {TOOL_CATALOG.map((tool) => (
                            <label key={tool.key} className="flex items-start gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={profile.tools.includes(tool.key)}
                                onChange={() => toggleProfileTool(profile.id, tool.key)}
                                className="mt-1"
                              />
                              <span className="min-w-0">
                                <span className="font-medium">{tool.label}</span>
                                <span className="block text-xs text-gray-500">
                                  {tool.description}
                                </span>
                              </span>
                            </label>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          Tip: selecting write tools enables Do-like behavior for this profile.
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* About Section */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold mb-3">About Earth Agent</h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p className="flex items-center justify-between">
              <span>Version:</span>
              <code className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">
                {chrome.runtime.getManifest().version}
              </code>
            </p>
            <a
              href="https://github.com/wybert/earth-agent-chrome-ext"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <span>GitHub Repository</span>
              <ExternalLink className="h-4 w-4" />
            </a>
            <a
              href="https://github.com/wybert/earth-agent-chrome-ext/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <span>Report an Issue</span>
              <ExternalLink className="h-4 w-4" />
            </a>
            <p className="pt-2 text-xs">AI-powered assistant for Google Earth Engine</p>
          </div>

          {/* Logo */}
          <div className="flex justify-center mt-6">
            <img
              src="/assets/icon.svg"
              alt="Earth Agent Logo"
              className="w-24 h-24 opacity-80 dark:opacity-70"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
