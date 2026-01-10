import {
  getSuggestedSessionTitle,
  migrateSessions,
  truncateText,
  createSessionRecord,
} from './chat-helpers';
import type { Message } from '../types/extension';

describe('Chat helpers', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('truncateText adds ellipsis when exceeding max', () => {
    const longText = 'a'.repeat(100);
    const result = truncateText(longText, 10);
    expect(result).toBe('aaaaaaaaa…');
  });

  it('getSuggestedSessionTitle uses first user line', () => {
    const messages: Message[] = [
      { id: '1', role: 'assistant', content: 'Hello' },
      { id: '2', role: 'user', content: 'First line\nSecond line' },
    ];
    const title = getSuggestedSessionTitle(messages, Date.now());
    expect(title).toBe('First line');
  });

  it('getSuggestedSessionTitle falls back to dated name', () => {
    const messages: Message[] = [{ id: '1', role: 'assistant', content: '' }];
    const title = getSuggestedSessionTitle(messages, Date.now());
    expect(title).toMatch(/Chat 1\/1\/2024/);
  });

  it('migrateSessions converts arrays and preserves meta overrides', () => {
    const raw = {
      s1: [
        { id: 'u1', role: 'user', content: 'hi' },
        { id: 'a1', role: 'assistant', content: 'hello' },
      ],
      s2: {
        meta: { title: 'Custom', pinned: true, createdAt: 1, updatedAt: 2 },
        messages: [{ id: 'u2', role: 'user', content: 'yo' }],
      },
    };
    const migrated = migrateSessions(raw);
    expect(Object.keys(migrated)).toEqual(['s1', 's2']);
    expect(migrated.s1.messages).toHaveLength(2);
    expect(migrated.s2.meta.title).toBe('Custom');
    expect(migrated.s2.meta.pinned).toBe(true);
  });

  it('createSessionRecord sets previews and timestamps', () => {
    const msg: Message = { id: 'u1', role: 'user', content: 'hello world' };
    const record = createSessionRecord('sid', [msg]);
    expect(record.id).toBe('sid');
    expect(record.meta.lastMessagePreview).toBe('hello world');
    expect(record.meta.createdAt).toBe(Date.now());
  });
});
