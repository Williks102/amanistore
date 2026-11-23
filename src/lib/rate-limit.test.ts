import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ ip: '1.1.1.1' }));
vi.mock('next/headers', () => ({
  headers: async () => ({ get: (k: string) => (k === 'x-forwarded-for' ? h.ip : null) }),
}));

import { rateLimit } from './rate-limit';

describe('rateLimit', () => {
  beforeEach(() => { vi.useRealTimers(); });

  it('autorise jusqu’à la limite puis bloque', async () => {
    h.ip = '10.0.0.1';
    for (let i = 0; i < 3; i++) expect(await rateLimit('t1', 3, 60_000)).toBe(true);
    expect(await rateLimit('t1', 3, 60_000)).toBe(false);
  });

  it('compte séparément chaque IP et chaque action', async () => {
    h.ip = '10.0.0.2';
    expect(await rateLimit('t2', 1, 60_000)).toBe(true);
    expect(await rateLimit('t2', 1, 60_000)).toBe(false);
    expect(await rateLimit('autre-action', 1, 60_000)).toBe(true);
    h.ip = '10.0.0.3';
    expect(await rateLimit('t2', 1, 60_000)).toBe(true);
  });

  it('libère après la fenêtre de temps', async () => {
    vi.useFakeTimers();
    h.ip = '10.0.0.4';
    expect(await rateLimit('t3', 1, 1000)).toBe(true);
    expect(await rateLimit('t3', 1, 1000)).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(await rateLimit('t3', 1, 1000)).toBe(true);
  });
});
