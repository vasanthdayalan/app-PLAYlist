import { ForbiddenException, Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { PrismaService } from '../prisma/prisma.service.js';

const scrypt = promisify(scryptCallback) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export const ADMIN_TOKEN_KEY = 'admin_token_hash';
const MIN_TOKEN_LENGTH = 12;
const KEY_LENGTH = 64;

// Stores only a salted scrypt hash of the admin token, never the token itself.
@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ADMIN_TOKEN seeds the stored hash only when none exists. Later changes go through rotate().
  async onModuleInit(): Promise<void> {
    const seed = process.env.ADMIN_TOKEN?.trim();
    if (!seed || (await this.isConfigured())) return;
    if (seed.length < MIN_TOKEN_LENGTH) {
      throw new Error(`ADMIN_TOKEN must be at least ${MIN_TOKEN_LENGTH} characters`);
    }
    await this.store(seed);
    this.logger.log('Admin token stored from ADMIN_TOKEN');
  }

  // Throws 403 when admin mode is not configured, 401 when the token does not match.
  async assertAdmin(token: string | undefined): Promise<void> {
    const stored = await this.prisma.setting.findUnique({ where: { key: ADMIN_TOKEN_KEY } });
    if (!stored) throw new ForbiddenException({ code: 'ADMIN_DISABLED', message: 'Admin mode is not configured' });
    if (!token || !(await verifyHash(token, stored.value))) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Invalid admin token' });
    }
  }

  async rotate(token: string): Promise<void> {
    await this.store(token);
    this.logger.log('Admin token changed');
  }

  private async isConfigured(): Promise<boolean> {
    return (await this.prisma.setting.count({ where: { key: ADMIN_TOKEN_KEY } })) > 0;
  }

  private async store(token: string): Promise<void> {
    const value = await hashToken(token);
    await this.prisma.setting.upsert({
      where: { key: ADMIN_TOKEN_KEY },
      create: { key: ADMIN_TOKEN_KEY, value },
      update: { value },
    });
  }
}

async function hashToken(token: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(token, salt, KEY_LENGTH);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

async function verifyHash(token: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split(':');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(token, Buffer.from(saltHex, 'hex'), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
