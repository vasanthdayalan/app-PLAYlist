import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { AuthService, ADMIN_TOKEN_KEY } from './auth.service.js';

function fakePrisma() {
  const rows = new Map<string, string>();
  return {
    rows,
    setting: {
      findUnique: vi.fn(async ({ where }: { where: { key: string } }) =>
        rows.has(where.key) ? { key: where.key, value: rows.get(where.key)! } : null,
      ),
      count: vi.fn(async ({ where }: { where: { key: string } }) => (rows.has(where.key) ? 1 : 0)),
      upsert: vi.fn(async ({ where, update }: { where: { key: string }; update: { value: string } }) => {
        rows.set(where.key, update.value);
        return { key: where.key, value: update.value };
      }),
    },
  };
}

describe('AuthService', () => {
  const originalEnv = process.env.ADMIN_TOKEN;
  let prisma: ReturnType<typeof fakePrisma>;
  let auth: AuthService;

  beforeEach(() => {
    prisma = fakePrisma();
    auth = new AuthService(prisma as never);
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.ADMIN_TOKEN;
    else process.env.ADMIN_TOKEN = originalEnv;
  });

  it('returns 403 when admin mode is not configured', async () => {
    await expect(auth.assertAdmin('any-token-value')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('seeds the hash from ADMIN_TOKEN only when no row exists', async () => {
    process.env.ADMIN_TOKEN = 'seed-token-123';
    await auth.onModuleInit();
    const stored = prisma.rows.get(ADMIN_TOKEN_KEY)!;
    expect(stored).toMatch(/^scrypt:[0-9a-f]+:[0-9a-f]+$/);
    expect(stored).not.toContain('seed-token-123');

    process.env.ADMIN_TOKEN = 'different-token-456';
    await auth.onModuleInit();
    expect(prisma.rows.get(ADMIN_TOKEN_KEY)).toBe(stored);
  });

  it('rejects a seed token shorter than 12 characters', async () => {
    process.env.ADMIN_TOKEN = 'short';
    await expect(auth.onModuleInit()).rejects.toThrow(/at least 12/);
  });

  it('returns 401 for a missing or wrong token and passes the right one', async () => {
    await auth.rotate('correct-token-789');
    await expect(auth.assertAdmin(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(auth.assertAdmin('wrong-token-000')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(auth.assertAdmin('correct-token-789')).resolves.toBeUndefined();
  });

  it('rotate replaces the previous token', async () => {
    await auth.rotate('first-token-aaaa');
    await auth.rotate('second-token-bbb');
    await expect(auth.assertAdmin('first-token-aaaa')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(auth.assertAdmin('second-token-bbb')).resolves.toBeUndefined();
  });
});
