/**
 * Session Export/Import Utilities
 *
 * Provides functions to export chat sessions as JSON or Markdown,
 * and import previously exported sessions.
 */

import type { Message } from '../types/extension';
import type { StoredChatSession, ChatSessions, ChatSessionMeta } from './chat-helpers';

// Export format version for future compatibility
const EXPORT_VERSION = '1.0';

/**
 * Exported session format for JSON files
 */
export interface ExportedData {
  version: string;
  exportedAt: string;
  source: 'earth-agent';
  sessions: StoredChatSession[];
}

/**
 * Export a single session to JSON string
 */
export const exportSessionToJSON = (session: StoredChatSession): string => {
  const exportData: ExportedData = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    source: 'earth-agent',
    sessions: [session],
  };
  return JSON.stringify(exportData, null, 2);
};

/**
 * Export all sessions to JSON string
 */
export const exportAllSessionsToJSON = (sessions: ChatSessions): string => {
  const sessionList = Object.values(sessions);
  const exportData: ExportedData = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    source: 'earth-agent',
    sessions: sessionList,
  };
  return JSON.stringify(exportData, null, 2);
};

/**
 * Format a message for Markdown export
 */
const formatMessageForMarkdown = (message: Message): string => {
  const role = message.role === 'user' ? 'User' : 'Assistant';
  let content = message.content || '';

  // Handle multipart messages (e.g., with images)
  if (message.parts && message.parts.length > 0) {
    const textParts = message.parts
      .filter(p => p.type === 'text' && p.text)
      .map(p => p.text)
      .join('\n');

    const imageParts = message.parts
      .filter(p => p.type === 'image' || p.mimeType?.startsWith('image/'))
      .map(p => `[Image: ${p.name || 'attachment'}]`)
      .join('\n');

    content = [textParts, imageParts].filter(Boolean).join('\n');
  }

  return `## ${role}\n\n${content}\n`;
};

/**
 * Export a single session to Markdown string
 */
export const exportSessionToMarkdown = (session: StoredChatSession): string => {
  const { meta, messages } = session;
  const exportDate = new Date().toISOString().split('T')[0];
  const createdDate = new Date(meta.createdAt).toLocaleDateString();

  const lines: string[] = [
    `# ${meta.title}`,
    '',
    `*Created: ${createdDate} | Exported: ${exportDate}*`,
    '',
    '---',
    '',
  ];

  // Filter out welcome messages for cleaner export
  const conversationMessages = messages.filter(
    msg => !msg.id.startsWith('welcome-') || msg.content !== "Hello! I'm your Earth Engine Assistant. How can I help you with Earth Engine today?"
  );

  for (const message of conversationMessages) {
    lines.push(formatMessageForMarkdown(message));
    lines.push('---');
    lines.push('');
  }

  lines.push('');
  lines.push('*Exported from Earth Agent*');

  return lines.join('\n');
};

/**
 * Validate imported JSON data structure
 */
const validateImportedData = (data: any): data is ExportedData => {
  if (!data || typeof data !== 'object') return false;
  if (!data.sessions || !Array.isArray(data.sessions)) return false;

  // Validate each session has required fields
  for (const session of data.sessions) {
    if (!session.id || typeof session.id !== 'string') return false;
    if (!session.meta || typeof session.meta !== 'object') return false;
    if (!session.messages || !Array.isArray(session.messages)) return false;
  }

  return true;
};

/**
 * Generate a new unique session ID
 */
const generateNewSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Parse and validate imported JSON, returning sessions with new IDs
 */
export const parseImportedJSON = (jsonString: string): StoredChatSession[] => {
  let data: any;

  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    throw new Error('Invalid JSON format. Please select a valid export file.');
  }

  // Handle legacy format (direct sessions object)
  if (!data.sessions && typeof data === 'object') {
    // Check if it looks like a sessions object
    const values = Object.values(data);
    if (values.length > 0 && values.every((v: any) => v?.messages && v?.meta)) {
      data = { sessions: values };
    }
  }

  if (!validateImportedData(data)) {
    throw new Error('Invalid export file format. Please select a file exported from Earth Agent.');
  }

  // Generate new IDs to avoid conflicts
  const importedSessions: StoredChatSession[] = data.sessions.map((session: StoredChatSession) => {
    const newId = generateNewSessionId();
    const now = Date.now();

    // Generate new message IDs
    const newMessages: Message[] = session.messages.map((msg, index) => ({
      ...msg,
      id: `${newId}-msg-${index}-${Date.now()}`,
    }));

    const newMeta: ChatSessionMeta = {
      ...session.meta,
      id: newId,
      title: session.meta.title + ' (Imported)',
      updatedAt: now,
      pinned: false, // Don't preserve pinned status on import
    };

    return {
      id: newId,
      meta: newMeta,
      messages: newMessages,
    };
  });

  return importedSessions;
};

/**
 * Trigger a file download in the browser
 */
export const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

/**
 * Generate a safe filename from session title
 */
export const generateFilename = (title: string, extension: string): string => {
  const safeTitle = title
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 50);

  const date = new Date().toISOString().split('T')[0];
  return `earth-agent-${safeTitle || 'session'}-${date}.${extension}`;
};

/**
 * Trigger file input dialog and return file content
 */
export const triggerFileImport = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsText(file);
    };

    input.oncancel = () => {
      reject(new Error('File selection cancelled'));
    };

    input.click();
  });
};
