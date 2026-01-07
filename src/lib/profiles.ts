import type { AgentProfile, ToolKey } from '@/types/extension';

export const PROFILES_STORAGE_KEY = 'earth_agent_profiles';
export const ACTIVE_PROFILE_ID_STORAGE_KEY = 'earth_agent_active_profile_id';
export const MODE_SELECTION_STORAGE_KEY = 'earth_agent_mode_selection';

// Validation limits for chrome.storage.sync (100KB total, 8KB per item)
export const PROFILE_LIMITS = {
  MAX_PROFILES: 20,
  MAX_NAME_LENGTH: 50,
  MAX_PROMPT_LENGTH: 4000, // ~4KB to stay safely under 8KB per item limit
} as const;

export interface ToolCatalogItem {
  key: ToolKey;
  label: string;
  description: string;
  kind: 'read' | 'write';
}

export const TOOL_CATALOG: ToolCatalogItem[] = [
  // Utility tools
  { key: 'weather', label: 'Weather', description: 'Get current weather for a location', kind: 'read' },
  { key: 'dateTime', label: 'Date/Time', description: 'Get current date/time (optional time zone)', kind: 'read' },
  { key: 'wait', label: 'Wait', description: 'Wait for specified seconds (for long-running operations)', kind: 'read' },

  // Simplified code editing tools (Claude Code-style)
  { key: 'readCode', label: 'Read Code', description: 'Read current code from Earth Engine editor', kind: 'read' },
  { key: 'editCode', label: 'Edit Code', description: 'Edit code using old_string/new_string replacement', kind: 'write' },
  { key: 'writeCode', label: 'Write Code', description: 'Overwrite entire editor content', kind: 'write' },
  { key: 'undoEdit', label: 'Undo Edit', description: 'Undo the last code edit', kind: 'write' },

  // Earth Engine tools
  { key: 'geeDocs', label: 'GEE Docs', description: 'Search GEE datasets (official/community) and API documentation', kind: 'read' },
  { key: 'runCurrentCode', label: 'Run Code', description: 'Execute current code in editor', kind: 'write' },

  // Browser interaction tools
  { key: 'screenshot', label: 'Screenshot', description: 'Take a screenshot of the current page', kind: 'read' },
  { key: 'snapshot', label: 'Snapshot', description: 'Capture accessibility snapshot of the page', kind: 'read' },
  { key: 'clickByRefId', label: 'Click (Ref ID)', description: 'Click an element by ref id', kind: 'read' },
  { key: 'clickAtScreenPosition', label: 'Click (Screen)', description: 'Click at screen x/y position', kind: 'read' },

  // Earth Engine state tools
  { key: 'getConsoleOutput', label: 'Console Output', description: 'Get Earth Engine console output', kind: 'read' },
  { key: 'getMapScreenPosition', label: 'Map Position', description: 'Get map screen position and bounds', kind: 'read' },
  { key: 'getInspectorOutput', label: 'Inspector Output', description: 'Get map inspector output', kind: 'read' },
  { key: 'clearMapInspectorAndConsole', label: 'Clear All', description: 'Clear map, inspector, and console', kind: 'write' },
];

export const DEFAULT_PROFILE_TOOLS: ToolKey[] = [
  'readCode',
  'dateTime',
  'weather',
  'geeDocs',
  'snapshot',
  'getMapScreenPosition',
  'getConsoleOutput',
];

export function createEmptyProfile(now = Date.now()): AgentProfile {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `p_${now}_${Math.random().toString(16).slice(2)}`,
    name: 'New profile',
    prompt: '',
    tools: [...DEFAULT_PROFILE_TOOLS],
    createdAt: now,
    updatedAt: now,
  };
}

export function truncateLabel(text: string, max = 14): string {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function inferBaseModeFromTools(tools: ToolKey[]): 'ask' | 'do' {
  const writeKeys = new Set<ToolKey>(TOOL_CATALOG.filter(t => t.kind === 'write').map(t => t.key));
  return tools.some(t => writeKeys.has(t)) ? 'do' : 'ask';
}

export function migrateProfiles(raw: unknown): AgentProfile[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p: any) => {
      if (!p || typeof p !== 'object') return null;
      if (typeof p.id !== 'string' || typeof p.name !== 'string') return null;
      const tools = Array.isArray(p.tools) ? (p.tools.filter((t: any) => typeof t === 'string') as ToolKey[]) : [];
      return {
        id: p.id,
        name: p.name,
        prompt: typeof p.prompt === 'string' ? p.prompt : '',
        tools,
        createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
        updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : Date.now(),
      } satisfies AgentProfile;
    })
    .filter(Boolean) as AgentProfile[];
}
