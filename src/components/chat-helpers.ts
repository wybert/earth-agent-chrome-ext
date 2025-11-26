import type { Message } from '../types/extension';

const truncateText = (text: string, max = 80) => {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

const getLastMessagePreview = (messages: Message[]) => {
  const last = [...messages].reverse().find((msg) => (msg.content || '').trim().length > 0);
  return last ? truncateText(last.content || '', 80) : '';
};

const getSuggestedSessionTitle = (messages: Message[], timestamp: number) => {
  const firstUser = messages.find((msg) => msg.role === 'user' && (msg.content || '').trim().length > 0);
  if (firstUser) {
    const firstLine = firstUser.content?.split('\n')[0] || '';
    return truncateText(firstLine.trim(), 40) || `Chat ${new Date(timestamp).toLocaleDateString()}`;
  }
  return `Chat ${new Date(timestamp).toLocaleDateString()}`;
};

const createWelcomeMessage = (): Message => ({
  id: `welcome-${Date.now()}`,
  role: 'assistant',
  content: "Hello! I'm your Earth Engine Assistant. How can I help you with Earth Engine today?",
});

interface ChatSessionMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  lastMessagePreview?: string;
  pinned?: boolean;
}

interface StoredChatSession {
  id: string;
  meta: ChatSessionMeta;
  messages: Message[];
}

type ChatSessions = Record<string, StoredChatSession>;

const createSessionRecord = (
  sessionId: string,
  messages: Message[] = [createWelcomeMessage()],
  metaOverrides: Partial<ChatSessionMeta> = {}
): StoredChatSession => {
  const now = Date.now();
  const preview = getLastMessagePreview(messages);
  const meta: ChatSessionMeta = {
    id: sessionId,
    title: metaOverrides.title || getSuggestedSessionTitle(messages, now),
    createdAt: metaOverrides.createdAt ?? now,
    updatedAt: metaOverrides.updatedAt ?? now,
    lastMessagePreview: metaOverrides.lastMessagePreview ?? preview,
    pinned: metaOverrides.pinned ?? false,
  };

  return {
    id: sessionId,
    meta,
    messages,
  };
};

const migrateSessions = (rawSessions: any): ChatSessions => {
  if (!rawSessions || typeof rawSessions !== 'object') {
    return {};
  }

  const migrated: ChatSessions = {};
  Object.entries(rawSessions as Record<string, any>).forEach(([sessionId, value]) => {
    if (Array.isArray(value)) {
      migrated[sessionId] = createSessionRecord(sessionId, value as Message[]);
      return;
    }

    if (value && typeof value === 'object') {
      const stored = value as Partial<StoredChatSession> & { messages?: Message[] };
      const messages = Array.isArray(stored.messages) ? stored.messages : [];
      const overrides: Partial<ChatSessionMeta> = stored.meta || {};
      migrated[sessionId] = createSessionRecord(sessionId, messages, overrides);
    }
  });

  return migrated;
};

export {
  truncateText,
  getLastMessagePreview,
  getSuggestedSessionTitle,
  createSessionRecord,
  migrateSessions,
  createWelcomeMessage,
  type ChatSessionMeta,
  type StoredChatSession,
  type ChatSessions,
};
